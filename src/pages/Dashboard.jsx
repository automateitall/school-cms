import { useEffect, useState } from 'react'
import Layout from '../components/layout/Layout'
import api from '../lib/api'

export default function Dashboard() {
  const [stats, setStats] = useState({
    students: 0,
    notices: 0,
    admissions: 0
  })
  const user = JSON.parse(localStorage.getItem('user') || '{}')

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [students, notices, admissions] = await Promise.all([
          api.get('/students'),
          api.get('/notices'),
          api.get('/admissions')
        ])
        setStats({
          students: students.data.length,
          notices: notices.data.length,
          admissions: admissions.data.length
        })
      } catch (err) {
        console.error(err)
      }
    }
    fetchStats()
  }, [])

  const cards = [
    { label: 'Total Students', value: stats.students, color: '#083e78', bg: '#e8f0fb' },
    { label: 'Notices Posted', value: stats.notices, color: '#00bf63', bg: '#e6f9f0' },
    { label: 'Admission Enquiries', value: stats.admissions, color: '#ff914d', bg: '#fff3ec' },
  ]

  return (
    <Layout>
      <div className="mb-8">
        <h1 style={{ color: '#083e78' }} className="text-2xl font-bold">
          Welcome, {user.name} 👋
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-5 mb-8">
        {cards.map(card => (
          <div key={card.label}
            style={{ background: card.bg }}
            className="rounded-xl p-5 border border-gray-200">
            <p className="text-gray-500 text-sm mb-1">{card.label}</p>
            <p style={{ color: card.color }} className="text-4xl font-bold">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 style={{ color: '#083e78' }} className="font-semibold mb-1">Quick actions</h2>
        <p className="text-gray-400 text-sm mb-4">What do you want to do today?</p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Add a student', href: '/students' },
            { label: 'Post a notice', href: '/notices' },
            { label: 'View admissions', href: '/admissions' },
            { label: 'Add another staff', href: '/staff' },
          ].map(action => (
            <a key={action.label} href={action.href}
              style={{ borderColor: '#083e78', color: '#083e78' }}
              className="border rounded-lg px-4 py-3 text-sm font-medium hover:bg-blue-50 transition">
              {action.label} →
            </a>
          ))}
        </div>
      </div>
    </Layout>
  )
} 
