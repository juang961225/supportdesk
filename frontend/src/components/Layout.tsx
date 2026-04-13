import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import ThemeToggle from './ThemeToggle'

// Definimos los items del menú según el rol
const menuItems = {
  superadmin: [
    { label: 'Dashboard', path: '/superadmin/dashboard' },
    { label: 'Marcas', path: '/superadmin/brands' },
    { label: 'Usuarios', path: '/superadmin/users' },
  ],
  admin: [
    { label: 'Dashboard', path: '/admin/dashboard' },
    { label: 'Tickets', path: '/admin/tickets' },
    { label: 'Categorías', path: '/admin/categories' },
    { label: 'Usuarios', path: '/admin/users' },
  ],
  soporte: [
    { label: 'Mis Tickets', path: '/soporte/dashboard' },
  ],
  usuario: [
    { label: 'Mis Tickets', path: '/usuario/dashboard' },
    { label: 'Nuevo Ticket', path: '/usuario/tickets/new' },
  ],
}

function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  // location.pathname → la URL actual, para marcar el item activo

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  // Obtiene el menú según el rol del usuario
  const items = menuItems[user?.rol as keyof typeof menuItems] || []

  return (
    <div className="flex min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors">

      {/* Sidebar */}
      <aside className="w-64 bg-white dark:bg-gray-800 shadow-sm flex flex-col transition-colors">

        {/* Logo */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h1 className="text-xl font-bold text-blue-600 dark:text-blue-400">
            SupportDesk
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 capitalize">
            {user?.rol}
          </p>
        </div>

        {/* Menú */}
        <nav className="flex-1 p-4">
          <ul className="space-y-1">
            {items.map((item) => {
              const isActive = location.pathname === item.path
              return (
                <li key={item.path}>
                  <button
                    onClick={() => navigate(item.path)}
                    className={`w-full text-left px-4 py-2 rounded-lg text-sm transition-colors ${
                      isActive
                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    {item.label}
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Usuario y logout */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <ThemeToggle />
          </div>
          <div className="mb-3">
            <p className="text-sm font-medium text-gray-800 dark:text-white truncate">
              {user?.nombre}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {user?.email}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full text-left px-4 py-2 rounded-lg text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            Cerrar sesión
          </button>
        </div>

      </aside>

      {/* Contenido principal */}
      <main className="flex-1 p-8 overflow-auto">
        {children}
      </main>

    </div>
  )
}

export default Layout