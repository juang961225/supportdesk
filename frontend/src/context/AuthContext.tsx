import { createContext, useState, useEffect } from 'react'
import { configurarSesion, renovarSesion, setAccessToken } from '../services/api'
import { logoutServidor } from '../services/authService'
import type { User } from '../types'

interface AuthContextType {
  user: User | null
  token: string | null
  isRestoring: boolean // true mientras se intenta recuperar la sesión con la cookie al cargar la app
  setAuth: (user: User, token: string) => void
  logout: () => Promise<void>
}

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext<AuthContextType | null>(null)

// Versiones anteriores guardaban la sesión en localStorage: se limpia
const limpiarSesionAntigua = () => {
  try {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  } catch {
    // almacenamiento bloqueado: no hay nada que limpiar
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isRestoring, setIsRestoring] = useState(true)

  const setAuth = (nuevoUser: User, nuevoToken: string) => {
    setAccessToken(nuevoToken)
    setUser(nuevoUser)
    setToken(nuevoToken)
  }

  const limpiar = () => {
    setAccessToken(null)
    setUser(null)
    setToken(null)
  }

  const logout = async () => {
    try {
      await logoutServidor()
    } catch {
      // Aunque falle la red, la sesión local se cierra igual
    }
    limpiar()
  }

  useEffect(() => {
    limpiarSesionAntigua()
    configurarSesion({
      alRenovar: (sesion) => {
        setUser(sesion.user)
        setToken(sesion.token)
      },
      alExpirar: () => {
        limpiar()
        // Recarga completa al login: ProtectedRoute ya no encuentra sesión
        if (window.location.pathname !== '/login') window.location.assign('/login')
      },
    })

    // Al cargar la app: si la cookie de sesión sigue vigente, se recupera sin pedir login
    renovarSesion()
      .catch(() => limpiar())
      .finally(() => setIsRestoring(false))
  }, [])

  return (
    <AuthContext.Provider value={{ user, token, isRestoring, setAuth, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
