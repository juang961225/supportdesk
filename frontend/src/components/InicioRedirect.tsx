import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { rutaInicio } from '../utils/rutas'
import CargandoPagina from './CargandoPagina'

// Ruta "/": lleva al inicio de cada rol, o al login si no hay sesión
function InicioRedirect() {
  const { user, isRestoring } = useAuth()
  if (isRestoring) return <CargandoPagina />
  return <Navigate to={user ? rutaInicio(user.rol) : '/login'} replace />
}

export default InicioRedirect
