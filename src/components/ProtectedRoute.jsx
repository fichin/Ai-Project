import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import './ProtectedRoute.css'

function ProtectedRoute({ children }) {
  const { user, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return <div className="protected-route-loading">Loading...</div>
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  return children
}

export default ProtectedRoute
