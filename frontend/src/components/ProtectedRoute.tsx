import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: string[]
}

function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, token, isRestoring } = useAuth()

  // Mientras se recupera la sesión con la cookie no se decide nada (evita mandar al login al recargar)
  if (isRestoring) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <p className="text-sm text-gray-500 dark:text-gray-400">Cargando…</p>
      </div>
    )
  }

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