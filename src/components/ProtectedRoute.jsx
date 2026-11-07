import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// `roles`: when given, only these roles may open the nested pages; others go to the dashboard.
export default function ProtectedRoute({ roles }) {
  const { token, user } = useAuth()
  const location = useLocation()

  if (!token) return <Navigate to="/login" replace />
  // A new or reset account must choose its own password before using the CMS
  if (user?.mustChangePassword && location.pathname !== '/account') return <Navigate to="/account" replace />
  if (roles && !roles.includes(user?.role)) return <Navigate to="/dashboard" replace />
  return <Outlet />
}
