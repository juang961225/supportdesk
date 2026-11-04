import { lazy, Suspense } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { useTheme } from './hooks/useTheme'
import LoginPage from './pages/LoginPage'
import ProtectedRoute from './components/ProtectedRoute'
import { ToastContainer } from './components/ToastContainer'
import ErrorBoundary from './components/ErrorBoundary'
import CargandoPagina from './components/CargandoPagina'
import InicioRedirect from './components/InicioRedirect'

// Cada pantalla se descarga al abrirla: el login no carga el código de todo lo demás
const SuperAdminDashboard = lazy(() => import('./pages/superadmin/SuperAdminDashboard'))
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'))
const SoporteDashboard = lazy(() => import('./pages/soporte/SoporteDashboard'))
const UsuarioDashboard = lazy(() => import('./pages/usuario/UsuarioDashboard'))
const BrandsPage = lazy(() => import('./pages/superadmin/BrandsPage'))
const UsersPage = lazy(() => import('./pages/superadmin/UsersPage'))
const TicketsPage = lazy(() => import('./pages/admin/TicketsPage'))
const CategoriesPage = lazy(() => import('./pages/admin/CategoriesPage'))
const AreasPage = lazy(() => import('./pages/admin/AreasPage'))
const HorarioPage = lazy(() => import('./pages/admin/HorarioPage'))
const SubMarcasPage = lazy(() => import('./pages/admin/SubMarcasPage'))
const AdminUsersPage = lazy(() => import('./pages/admin/UsersPage'))
const SoporteTicketDetail = lazy(() => import('./pages/soporte/TicketDetail'))
const NewTicketPage = lazy(() => import('./pages/usuario/NewTicketPage'))
const UsuarioTicketDetail = lazy(() => import('./pages/usuario/TicketDetail'))
const AdminTicketDetail = lazy(() => import('./pages/admin/TicketDetail'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))

function App() {
  useTheme()
  const { pathname } = useLocation()

  return (
    <>
      {/* La clave reinicia el aviso de error al navegar a otra pantalla */}
      <ErrorBoundary key={pathname}>
        <Suspense fallback={<CargandoPagina />}>
          <Routes>
            <Route path="/" element={<InicioRedirect />} />
            <Route path="/login" element={<LoginPage />} />

            <Route
              path="/superadmin/dashboard"
              element={
                <ProtectedRoute allowedRoles={['superadmin']}>
                  <SuperAdminDashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/dashboard"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="/soporte/dashboard"
              element={
                <ProtectedRoute allowedRoles={['soporte']}>
                  <SoporteDashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="/usuario/dashboard"
              element={
                <ProtectedRoute allowedRoles={['usuario']}>
                  <UsuarioDashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="/superadmin/brands"
              element={
                <ProtectedRoute allowedRoles={['superadmin']}>
                  <BrandsPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/superadmin/users"
              element={
                <ProtectedRoute allowedRoles={['superadmin']}>
                  <UsersPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/tickets"
              element={
                <ProtectedRoute allowedRoles={['admin', 'superadmin']}>
                  <TicketsPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/areas"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AreasPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/submarcas"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <SubMarcasPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/horario"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <HorarioPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/categories"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <CategoriesPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/users"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminUsersPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/tickets/:id"
              element={
                <ProtectedRoute allowedRoles={['admin', 'superadmin']}>
                  <AdminTicketDetail />
                </ProtectedRoute>
              }
            />

            <Route
              path="/soporte/tickets/:id"
              element={
                <ProtectedRoute allowedRoles={['soporte']}>
                  <SoporteTicketDetail />
                </ProtectedRoute>
              }
            />

            <Route
              path="/usuario/tickets/new"
              element={
                <ProtectedRoute allowedRoles={['usuario']}>
                  <NewTicketPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/usuario/tickets/:id"
              element={
                <ProtectedRoute allowedRoles={['usuario']}>
                  <UsuarioTicketDetail />
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
      <ToastContainer />
    </>
  )
}

export default App