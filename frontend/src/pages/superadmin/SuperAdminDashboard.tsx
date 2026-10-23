import { useState, useEffect } from 'react'
import Layout from '../../components/Layout'
import StatCard from '../../components/StatCard'
import EmptyState from '../../components/EmptyState'
import { PageSkeleton } from '../../components/Skeleton'
import { getSuperadminSummary } from '../../services/dashboardService'
import type { SuperadminSummary } from '../../services/dashboardService'
import { useToast } from '../../hooks/useToast'

const thClass = 'px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase'
const tdClass = 'px-4 py-2 text-sm text-gray-700 dark:text-gray-300'

function SuperAdminDashboard() {
  const { toast } = useToast()
  const [summary, setSummary] = useState<SuperadminSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        setSummary(await getSuperadminSummary())
      } catch {
        toast.error('No se pudieron cargar los datos del dashboard')
      } finally {
        setIsLoading(false)
      }
    }
    fetchSummary()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (isLoading) {
    return (
      <Layout>
        <PageSkeleton variant="dashboard" />
      </Layout>
    )
  }

  if (!summary) {
    return (
      <Layout>
        <EmptyState icon="⚠️" title="No se pudieron cargar los datos" description="Recarga la página para intentarlo de nuevo." />
      </Layout>
    )
  }

  const { totales, porMarca } = summary

  return (
    <Layout>
      <div>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">Dashboard</h2>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard label="Marcas activas" value={totales.marcasActivas} color="text-blue-600 dark:text-blue-400" />
          <StatCard label="Tickets abiertos" value={totales.abiertos} color="text-yellow-600 dark:text-yellow-400" />
          <StatCard label="Vencidos" value={totales.vencidos} color="text-red-600 dark:text-red-400" />
          <StatCard label="Usuarios activos" value={totales.usuariosActivos} color="text-green-600 dark:text-green-400" />
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-x-auto">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white p-4 pb-2">Por marca</h3>
          {porMarca.length === 0 ? (
            <EmptyState icon="🏢" title="No hay marcas creadas" description="Créalas desde la sección Marcas." />
          ) : (
            <table className="w-full">
              <thead>
                <tr>
                  <th className={thClass}>Marca</th>
                  <th className={thClass}>Estado</th>
                  <th className={thClass}>Abiertos</th>
                  <th className={thClass}>Vencidos</th>
                  <th className={thClass}>Cerrados</th>
                  <th className={thClass}>Usuarios activos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {porMarca.map((fila) => (
                  <tr key={fila.marca._id} className={fila.marca.estado === 'activo' ? '' : 'opacity-50'}>
                    <td className={`${tdClass} font-medium`}>{fila.marca.nombre}</td>
                    <td className={tdClass}>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        fila.marca.estado === 'activo'
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                          : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                      }`}>
                        {fila.marca.estado}
                      </span>
                    </td>
                    <td className={tdClass}>{fila.abiertos}</td>
                    <td className={tdClass}>
                      <span className={fila.vencidos > 0 ? 'text-red-600 dark:text-red-400 font-medium' : ''}>{fila.vencidos}</span>
                    </td>
                    <td className={tdClass}>{fila.cerrados}</td>
                    <td className={tdClass}>{fila.usuariosActivos}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </Layout>
  )
}

export default SuperAdminDashboard
