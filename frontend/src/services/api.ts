import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL
})

// Interceptor — agrega el token automáticamente a cada petición
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Interceptor — si el backend rechaza la sesión (token vencido, usuario o marca
// desactivados), cerramos sesión y volvemos al login.
// El login se excluye: ahí un 401 significa credenciales incorrectas.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isLoginRequest = error.config?.url === '/auth/login'
    if (axios.isAxiosError(error) && error.response?.status === 401 && !isLoginRequest) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      // Recarga completa: AuthContext arranca vacío desde localStorage
      window.location.assign('/login')
    }
    return Promise.reject(error)
  }
)

export default api
