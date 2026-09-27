import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const categories = [
  {
    title: 'Academic',
    links: [
      { to: '/students', label: 'Students', icon: '👥' },
      { to: '/attendance', label: 'Attendance', icon: '✅' },
      { to: '/marks', label: 'Marks & Results', icon: '📊' },
      { to: '/report-card', label: 'Report Cards', icon: '📄' },
      { to: '/subjects', label: 'Subjects', icon: '📚' },
      { to: '/exam-types', label: 'Exam Types', icon: '📋' },
    ],
  },
  {
    title: 'Communication',
    links: [
      { to: '/notices', label: 'Notices', icon: '📋' },
      { to: '/admissions', label: 'Admissions', icon: '🎓' },
    ],
  },
  {
    title: 'Content',
    links: [
      { to: '/gallery', label: 'Gallery', icon: '🖼️' },
      { to: '/settings', label: 'Settings', icon: '⚙️' },
    ],
  },
  {
    title: 'Tools',
    links: [
      { to: '/question-paper', label: 'Question Papers', icon: '📝' },
      { to: '/dashboard', label: 'Dashboard', icon: '⊞' },
    ],
  },
  {
    title: 'Administration',
    links: [
      { to: '/year-end', label: 'Year End Process', icon: '🎓' },
    ],
  },
]

export default function Sidebar({ open, onClose }) {
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <>
      {open && (
        <div onClick={onClose} className="fixed inset-0 bg-black/40 z-40 md:hidden" />
      )}
      <div
        style={{ background: '#64748b', width: '220px', height: '100vh' }}
        className={`flex flex-col justify-between py-4 px-4 fixed top-0 left-0 z-50 overflow-y-auto transition-transform duration-200 md:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >

        <div>
          <div className="mb-8 px-2 flex items-center justify-between">
            <div>
              <img src="/logo-cm.svg" alt="CM School" className="h-40 mb-3" />
              <p className="text-white text-xs opacity-60">Staff Portal</p>
            </div>
            <button onClick={onClose} className="md:hidden text-white text-2xl leading-none">×</button>
          </div>

          <nav className="space-y-4">
            {categories.map(category => (
              <div key={category.title}>
                <p className="text-white text-[10px] font-semibold uppercase tracking-wider opacity-40 px-3 mb-1">
                  {category.title}
                </p>
                <div className="space-y-1">
                  {category.links.map(link => (
                    <NavLink
                      key={link.to}
                      to={link.to}
                      onClick={onClose}
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
                </div>
              </div>
            ))}
          </nav>
        </div>

        <div className="px-2">
          <div className="border-t border-white/20 pt-4 mb-3">
            <p className="text-white text-sm font-medium">{user?.name}</p>
            <p className="text-white text-xs opacity-50">{user?.role}</p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full text-left text-white text-sm opacity-60 hover:opacity-100 transition"
          >
            Sign out →
          </button>
        </div>
      </div>
    </>
  )
}
