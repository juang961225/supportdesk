import { Navigate } from 'react-router-dom'

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: string[]
}

function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  // Lee el usuario del localStorage
  const userStr = localStorage.getItem('user')
  const token = localStorage.getItem('token')

  // Si no hay token, redirige al login
  if (!token || !userStr) {
    return <Navigate to="/login" replace />
  }

  // Convierte el string guardado a objeto
  const user = JSON.parse(userStr)

  // Si hay roles permitidos, verifica que el usuario tenga el rol correcto
  if (allowedRoles && !allowedRoles.includes(user.rol)) {
    return <Navigate to="/login" replace />
  }

  // Si todo está bien, muestra el contenido
  return <>{children}</>
}

export default ProtectedRoute