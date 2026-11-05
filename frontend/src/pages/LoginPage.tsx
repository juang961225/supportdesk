import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { login } from '../services/authService'
import { useAuth } from '../hooks/useAuth'
import ThemeToggle from '../components/ThemeToggle'
import { useToast } from '../hooks/useToast'
import { rutaInicio } from '../utils/rutas'

function LoginPage() {
  const { toast } = useToast()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [verPassword, setVerPassword] = useState(false)

  const navigate = useNavigate()
  const { setAuth } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email || !password) {
      toast.warning('Escribe tu correo y tu contraseña')
      return
    }

    setIsLoading(true)
    try {
      const response = await login({ email, password })
      setAuth(response.user, response.token)
      toast.success(`Bienvenido, ${response.user.nombre}`)

      navigate(rutaInicio(response.user.rol))
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const mensaje = err.response?.data?.message || 'Error al iniciar sesión'
        toast.error(mensaje)
      } else {
        toast.error('Error al iniciar sesión')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center px-4 transition-colors">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow w-full max-w-md transition-colors">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
          SupportDesk
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mb-6">
          Inicia sesión en tu cuenta
        </p>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="login-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Correo
            </label>
            <input
              id="login-email"
              autoComplete="username"
              autoFocus
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              placeholder="tu@email.com"
            />
          </div>
          <div className="mb-6">
            <label htmlFor="login-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Contraseña
            </label>
            <div className="relative">
            <input
              id="login-password"
              autoComplete="current-password"
              type={verPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pr-10 border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              placeholder="••••••"
            />
            <button
              type="button"
              onClick={() => setVerPassword((v) => !v)}
              aria-label={verPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              aria-pressed={verPassword}
              className="absolute inset-y-0 right-0 px-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              {verPassword ? <EyeOff className="w-4 h-4" aria-hidden="true" /> : <Eye className="w-4 h-4" aria-hidden="true" />}
            </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 text-white py-2 rounded font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Iniciando sesión...' : 'Iniciar sesión'}
          </button>
        </form>
      </div>
    </main>
  )
}

export default LoginPage