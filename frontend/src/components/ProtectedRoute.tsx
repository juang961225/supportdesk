import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import CargandoPagina from './CargandoPagina'
import SinPermisoPage from '../pages/SinPermisoPage'

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: string[]
}

function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, token, isRestoring } = useAuth()

  // Mientras se recupera la sesión con la cookie no se decide nada (evita mandar al login al recargar)
  if (isRestoring) {
    return <CargandoPagina />
  }

  if (!token || !user) {
    return <Navigate to="/login" replace />
  }

  // Tiene sesión pero esta pantalla es de otro rol
  if (allowedRoles && !allowedRoles.includes(user.rol)) {
    return <SinPermisoPage />
  }

  return <>{children}</>
}

export default ProtectedRoute