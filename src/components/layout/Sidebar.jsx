import { NavLink, useNavigate } from 'react-router-dom'

const links = [
  { to: '/dashboard', label: 'Dashboard', icon: '⊞' },
  { to: '/students', label: 'Students', icon: '👥' },
  { to: '/attendance', label: 'Attendance', icon: '✅' },
  { to: '/marks', label: 'Marks & Results', icon: '📊' },
  { to: '/report-card', label: 'Report Cards', icon: '📄' },
  { to: '/question-paper', label: 'Question Papers', icon: '📝' },
  { to: '/notices', label: 'Notices', icon: '📋' },
  { to: '/admissions', label: 'Admissions', icon: '🎓' },
]

export default function Sidebar() {
  const navigate = useNavigate()
  const user = JSON.parse(localStorage.getItem('user') || '{}')

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/login')
  }

  return (
    <div style={{ background: '#64748b', width: '220px', minHeight: '100vh' }}
      className="flex flex-col justify-between py-6 px-4 fixed top-0 left-0">

      <div>
        <div className="mb-8 px-2">
          <img src="/src/assets/logo-cm.svg" alt="CM School" className="h-40 mb-3" />
          <p className="text-white text-xs opacity-60">Staff Portal</p>
        </div>

        <nav className="space-y-1">
          {links.map(link => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition ${
                  isActive
                    ? 'bg-white text-gray-900 font-medium'
                    : 'text-white opacity-75 hover:opacity-100 hover:bg-white/10'
                }`
              }
            >
              <span>{link.icon}</span>
              {link.label}
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="px-2">
        <div className="border-t border-white/20 pt-4 mb-3">
          <p className="text-white text-sm font-medium">{user.name}</p>
          <p className="text-white text-xs opacity-50">{user.role}</p>
        </div>
        <button
          onClick={handleLogout}
          className="w-full text-left text-white text-sm opacity-60 hover:opacity-100 transition"
        >
          Sign out →
        </button>
      </div>
    </div>
  )
} 
