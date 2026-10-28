import axios from 'axios'
import type { InternalAxiosRequestConfig } from 'axios'
import type { User } from '../types'

// Sesión: el access token (15 min) vive solo en memoria; el refresh token (7 días) en una
// cookie httpOnly que el navegador manda sola a /auth/*. JavaScript nunca ve el refresh token.

export interface Sesion {
  token: string
  user: User
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true // necesario para que viaje la cookie de sesión
})

let accessToken: string | null = null
let alRenovar: (sesion: Sesion) => void = () => {}
let alExpirar: () => void = () => {}

export const setAccessToken = (token: string | null): void => {
  accessToken = token
}

// Para el tiempo real: el socket se autentica con el mismo access token
export const obtenerAccessToken = (): string | null => accessToken

// AuthContext se entera de las renovaciones y de la expiración de la sesión
export const configurarSesion = (callbacks: { alRenovar: (sesion: Sesion) => void; alExpirar: () => void }): void => {
  alRenovar = callbacks.alRenovar
  alExpirar = callbacks.alExpirar
}

const RUTAS_AUTH = ['/auth/login', '/auth/refresh', '/auth/logout']
const ESPERA_REINTENTO_MS = 300

const pedirRenovacion = async (): Promise<Sesion> => {
  try {
    return (await api.post<Sesion>('/auth/refresh')).data
  } catch (err) {
    // Otra pestaña renovó al mismo tiempo: su cookie nueva ya está en el navegador, se reintenta una vez
    if (axios.isAxiosError(err) && err.response?.data?.motivo === 'rotado') {
      await new Promise((resolver) => setTimeout(resolver, ESPERA_REINTENTO_MS))
      return (await api.post<Sesion>('/auth/refresh')).data
    }
    throw err
  }
}

// Una sola renovación a la vez: las peticiones que fallan juntas esperan la misma
let renovacionEnCurso: Promise<Sesion> | null = null

export const renovarSesion = (): Promise<Sesion> => {
  if (!renovacionEnCurso) {
    renovacionEnCurso = pedirRenovacion()
      .then((sesion) => {
        accessToken = sesion.token
        alRenovar(sesion)
        return sesion
      })
      .finally(() => {
        renovacionEnCurso = null
      })
  }
  return renovacionEnCurso
}

// Agrega el access token a cada petición
api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }
  return config
})

type ConfigReintento = InternalAxiosRequestConfig & { _reintentado?: boolean }

// Si el backend rechaza el access token (venció a los 15 min), se renueva con la cookie y se repite
// la petición una vez. Si la renovación falla (sesión vencida, cerrada o usuario desactivado) → login.
// Las rutas de /auth se excluyen: en el login un 401 significa credenciales incorrectas.
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config as ConfigReintento | undefined
    const esRutaAuth = RUTAS_AUTH.some((ruta) => config?.url === ruta)
    if (!axios.isAxiosError(error) || error.response?.status !== 401 || !config || esRutaAuth || config._reintentado) {
      return Promise.reject(error)
    }

    try {
      const sesion = await renovarSesion()
      config._reintentado = true
      config.headers.Authorization = `Bearer ${sesion.token}`
      return api(config)
    } catch {
      accessToken = null
      alExpirar()
      return Promise.reject(error)
    }
  }
)

export default api
