import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

const ROLE_REDIRECTS = {
  consultant: '/app/dashboard',
  client:     '/client/dashboard',
  employee:   '/assess',
}

function LoadingScreen() {
  return (
    <div style={{
      height: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: '#EEF5F9', gap: 16,
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: '50%',
        border: '3px solid rgba(27,191,176,0.2)',
        borderTopColor: '#1BBFB0',
        animation: 'pr-spin 0.8s linear infinite',
      }} />
      <div style={{ fontSize: 13, color: '#8A9BB0', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        Loading…
      </div>
      <style>{`@keyframes pr-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

export default function ProtectedRoute({ children, requiredRole }) {
  const { user, role, loading } = useAuth()

  if (loading) return <LoadingScreen />

  if (!user) return <Navigate to="/login" replace />

  if (requiredRole && role !== requiredRole) {
    const redirect = role ? (ROLE_REDIRECTS[role] || '/login') : '/login'
    return <Navigate to={redirect} replace />
  }

  return children
}
