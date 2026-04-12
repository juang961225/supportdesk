import { Routes, Route, Navigate } from 'react-router-dom'
import { useTheme } from './hooks/useTheme'
import LoginPage from './pages/LoginPage'
import SuperAdminDashboard from './pages/SuperAdminDashboard'
import AdminDashboard from './pages/AdminDashboard'
import SoporteDashboard from './pages/SoporteDashboard'
import UsuarioDashboard from './pages/UsuarioDashboard'

function App() {
  useTheme()

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/superadmin/dashboard" element={<SuperAdminDashboard />} />
      <Route path="/admin/dashboard" element={<AdminDashboard />} />
      <Route path="/soporte/dashboard" element={<SoporteDashboard />} />
      <Route path="/usuario/dashboard" element={<UsuarioDashboard />} />
      <Route path="*" element={<Navigate to="/login" />} />
    </Routes>
  )
}

export default App
