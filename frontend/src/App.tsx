import { Routes, Route, Navigate } from 'react-router-dom'
import { useTheme } from './hooks/useTheme'
import LoginPage from './pages/LoginPage'
import SuperAdminDashboard from './pages/SuperAdminDashboard'
import AdminDashboard from './pages/AdminDashboard'
import SoporteDashboard from './pages/SoporteDashboard'
import UsuarioDashboard from './pages/UsuarioDashboard'
import ProtectedRoute from './components/ProtectedRoute'
import BrandsPage from './pages/superadmin/BrandsPage'

function App() {
  useTheme()

  return (
    <Routes>
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

      <Route path="*" element={<Navigate to="/login" />} />
    </Routes>
  )
}

export default App