import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { login } from '../services/authService'
import ThemeToggle from '../components/ThemeToggle'

function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      setError('Email y password son obligatorios')
      return
    }
    setIsLoading(true)
    setError('')
    try {
      const response = await login({ email, password })
      localStorage.setItem('token', response.token)
      localStorage.setItem('user', JSON.stringify(response.user))
      const rol = response.user.rol
      if (rol === 'superadmin') navigate('/superadmin/dashboard')
      else if (rol === 'admin') navigate('/admin/dashboard')
      else if (rol === 'soporte') navigate('/soporte/dashboard')
      else navigate('/usuario/dashboard')
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const mensaje = err.response?.data?.message || 'Error al iniciar sesión'
        setError(mensaje)
      } else {
        setError('Error al iniciar sesión')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center transition-colors">

      {/* Botón de tema en la esquina superior derecha */}
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

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              placeholder="tu@email.com"
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              placeholder="••••••"
            />
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
    </div>
  )
}

export default LoginPage
