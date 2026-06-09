import { Navigate } from 'react-router-dom'

export default function ProtectedRoute({ user, loading, children }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-400">Chargement...</div>
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  return children
}
