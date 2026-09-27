import { useState } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/layout/Layout'
import api from '../lib/api'

const StepCard = ({ number, title, description, children }) => (
  <div className="bg-white border border-gray-200 rounded-xl p-6 mb-5 flex gap-5">
    <div style={{ background: '#083e78' }}
      className="flex-shrink-0 w-10 h-10 rounded-full text-white font-bold flex items-center justify-center">
      {number}
    </div>
    <div className="flex-1">
      <h3 className="font-semibold text-gray-800 mb-1">{title}</h3>
      <p className="text-gray-500 text-sm mb-4">{description}</p>
      {children}
    </div>
  </div>
)

export default function YearEnd() {
  const [promoting, setPromoting] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  const handlePromote = async () => {
    const confirmed = confirm(
      'This will promote all students to the next class. Class 5 students will be marked as Passed Out. This cannot be undone. Are you sure?'
    )
    if (!confirmed) return

    setPromoting(true)
    setError('')
    setResult(null)
    try {
      const res = await api.post('/admin/promote-students')
      setResult(res.data)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to promote students. Please try again.')
    } finally {
      setPromoting(false)
    }
  }

  return (
    <Layout>
      <div className="mb-6">
        <h1 style={{ color: '#083e78' }} className="text-2xl font-bold">Year End Process</h1>
        <p className="text-gray-500 text-sm mt-1">
          Follow these steps in order at the end of the academic session.
        </p>
      </div>

      <div style={{ background: '#fff3ec', color: '#c45e1e' }} className="rounded-lg px-4 py-3 text-sm mb-6">
        ⚠ This process makes permanent changes to student records. Complete Steps 1 and 2 before running Step 3, since promotion cannot be undone.
      </div>

      <StepCard number={1} title="Generate all Final Exam report cards"
        description="Make sure every student's Final Exam report card has been generated and reviewed before promoting classes.">
        <Link to="/report-card"
          style={{ background: '#083e78' }}
          className="inline-block text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition">
          Go to Report Cards →
        </Link>
      </StepCard>

      <StepCard number={2} title="Review and mark leaving students"
        description="Update the status of any students who are transferring out, leaving, or otherwise should not be promoted, before running the promotion.">
        <Link to="/students"
          style={{ background: '#083e78' }}
          className="inline-block text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition">
          Go to Students →
        </Link>
      </StepCard>

      <StepCard number={3} title="Promote all students"
        description="Moves every active student up one class. Class 5 students are marked Passed Out. This action is irreversible.">
        <button onClick={handlePromote} disabled={promoting}
          style={{ background: '#e53e3e' }}
          className="text-white px-6 py-3 rounded-lg text-sm font-semibold hover:opacity-90 transition disabled:opacity-50">
          {promoting ? 'Promoting...' : 'Promote All Students'}
        </button>

        {error && (
          <div style={{ background: '#ffeaea', color: '#e53e3e' }} className="rounded-lg px-4 py-3 text-sm mt-4">
            {error}
          </div>
        )}

        {result && (
          <div style={{ background: '#e6f9f0', color: '#166534' }} className="rounded-lg px-4 py-3 text-sm mt-4">
            ✅ Promoted {result.totalPromoted} students. {result.passedOut} students passed out.
          </div>
        )}
      </StepCard>

      <StepCard number={4} title="Change current session"
        description="Update the current session (e.g. 2026-27 → 2027-28) so new records are tagged correctly going forward.">
        <Link to="/settings"
          style={{ background: '#083e78' }}
          className="inline-block text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition">
          Go to Settings →
        </Link>
      </StepCard>
    </Layout>
  )
}
