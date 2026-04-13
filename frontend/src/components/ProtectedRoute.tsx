import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: string[]
}

function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, token, isLoading } = useAuth()

  // Espera a que termine de leer localStorage
  if (isLoading) return null

  // Si no hay token redirige al login
  if (!token || !user) {
    return <Navigate to="/login" replace />
  }

  // Si hay roles permitidos verifica el rol
  if (allowedRoles && !allowedRoles.includes(user.rol)) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

export default ProtectedRoute