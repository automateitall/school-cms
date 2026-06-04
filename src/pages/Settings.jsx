 
import { useEffect, useState } from 'react'
import Layout from '../components/layout/Layout'
import api from '../lib/api'
import { CLASS_ORDER } from '../lib/classes'

const Section = ({ title, children }) => (
  <div className="bg-white border border-gray-200 rounded-xl p-5 mb-5">
    <h2 style={{ color: '#083e78' }} className="font-semibold text-sm mb-4 pb-3 border-b border-gray-100">{title}</h2>
    <div className="grid grid-cols-2 gap-4">{children}</div>
  </div>
)

const Field = ({ label, value, onChange, type = 'text', full = false, textarea = false }) => (
  <div className={full ? 'col-span-2' : ''}>
    <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
    {textarea ? (
      <textarea value={value} onChange={e => onChange(e.target.value)} rows={3}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none resize-none" />
    ) : (
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none" />
    )}
  </div>
)

export default function Settings() {
  const [settings, setSettings] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    api.get('/settings').then(res => setSettings(res.data)).catch(console.error)
  }, [])

  const update = (key, value) => setSettings(prev => ({ ...prev, [key]: value }))

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.post('/settings', settings)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  if (!settings) return (
    <Layout>
      <div className="text-center text-gray-400 py-20">Loading settings...</div>
    </Layout>
  )

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 style={{ color: '#083e78' }} className="text-2xl font-bold">Website Settings</h1>
          <p className="text-gray-500 text-sm mt-1">Control all content shown on the public website</p>
        </div>
        <div className="flex items-center gap-3">
          {saved && <span style={{ color: '#00bf63' }} className="text-sm font-medium">✅ Saved!</span>}
          <button onClick={handleSave} disabled={saving}
            style={{ background: '#083e78' }}
            className="text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50">
            {saving ? 'Saving...' : 'Save All Changes'}
          </button>
        </div>
      </div>

      <Section title="School Information">
        <Field label="Phone Number" value={settings.phone} onChange={v => update('phone', v)} />
        <Field label="Email Address" value={settings.email} onChange={v => update('email', v)} />
        <Field label="Address" value={settings.address} onChange={v => update('address', v)} full />
        <Field label="School Hours" value={settings.schoolHours} onChange={v => update('schoolHours', v)} />
        <Field label="Working Days" value={settings.workingDays} onChange={v => update('workingDays', v)} />
        <Field label="Founded Year" value={settings.foundedYear} onChange={v => update('foundedYear', v)} />
        <Field label="CBSE Eyebrow Badge" value={settings.cmSchoolEyebrow} onChange={v => update('cmSchoolEyebrow', v)} />
      </Section>

      <Section title="Stats (shown on homepage and about page)">
        <Field label="Years of Excellence" value={settings.yearsOfExcellence} onChange={v => update('yearsOfExcellence', v)} />
        <Field label="Total Students" value={settings.totalStudents} onChange={v => update('totalStudents', v)} />
        <Field label="Faculty Count" value={settings.facultyCount} onChange={v => update('facultyCount', v)} />
        <Field label="Pass Rate" value={settings.passRate} onChange={v => update('passRate', v)} />
        <Field label="Campuses" value={settings.campuses} onChange={v => update('campuses', v)} />
      </Section>

      <Section title="Class Range">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Classes From</label>
          <select value={settings.classFrom} onChange={e => update('classFrom', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none">
            {CLASS_ORDER.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Classes To</label>
            <select value={settings.classTo} onChange={e => update('classTo', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none">
              {CLASS_ORDER.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </Section>

      <Section title="Notice Bar">
        <Field label="Notice Bar Text" value={settings.noticeBarText} onChange={v => update('noticeBarText', v)} full />
      </Section>

      <Section title="Homepage Hero">
        <Field label="Hero Heading" value={settings.heroHeading} onChange={v => update('heroHeading', v)} full />
        <Field label="Hero Subheading" value={settings.heroSubheading} onChange={v => update('heroSubheading', v)} full />
        <Field label="Hero Description" value={settings.heroDescription} onChange={v => update('heroDescription', v)} full textarea />
        <Field label="Admissions Card Title" value={settings.heroCardTitle} onChange={v => update('heroCardTitle', v)} />
        <Field label="Admissions Card Subtitle" value={settings.heroCardSubtitle} onChange={v => update('heroCardSubtitle', v)} />
      </Section>

      <Section title="Seat Availability">
        {[
          { label: 'Play Group (TZP)', key: 'seatPlayGroup' },
          { label: 'Nursery – Class V', key: 'seatNurseryV' },
          { label: 'Class VI – X', key: 'seatVIX' },
          { label: 'Class XI – XII', key: 'seatXXII' },
        ].map(s => (
          <div key={s.key}>
            <label className="block text-xs font-medium text-gray-600 mb-1">{s.label}</label>
            <select value={settings[s.key]} onChange={e => update(s.key, e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none">
              <option>Open</option>
              <option>Limited</option>
              <option>Few Seats</option>
              <option>Closed</option>
            </select>
          </div>
        ))}
      </Section>

      <Section title="School Cards">
        <Field label="CM School Tag" value={settings.cmSchoolTag} onChange={v => update('cmSchoolTag', v)} />
        <Field label="TZP School Tag" value={settings.tzpSchoolTag} onChange={v => update('tzpSchoolTag', v)} />
        <Field label="CM School Description" value={settings.cmSchoolDescription} onChange={v => update('cmSchoolDescription', v)} full textarea />
        <Field label="TZP School Description" value={settings.tzpSchoolDescription} onChange={v => update('tzpSchoolDescription', v)} full textarea />
      </Section>

      <Section title="Features Section">
        {[1,2,3,4].map(n => (
          <>
            <Field key={`t${n}`} label={`Feature ${n} Title`} value={settings[`feature${n}Title`]} onChange={v => update(`feature${n}Title`, v)} />
            <Field key={`d${n}`} label={`Feature ${n} Description`} value={settings[`feature${n}Desc`]} onChange={v => update(`feature${n}Desc`, v)} />
          </>
        ))}
      </Section>

      <Section title="CTA Section">
        <Field label="CTA Heading" value={settings.ctaHeading} onChange={v => update('ctaHeading', v)} full />
      </Section>

      <Section title="About Page">
        <Field label="Principal's Quote" value={settings.principalQuote} onChange={v => update('principalQuote', v)} full textarea />
        <Field label="Vision" value={settings.vision} onChange={v => update('vision', v)} full textarea />
        <Field label="Mission" value={settings.mission} onChange={v => update('mission', v)} full textarea />
        <Field label="Values" value={settings.values} onChange={v => update('values', v)} full textarea />
      </Section>
    </Layout>
  )
}