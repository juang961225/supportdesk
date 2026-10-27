import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../../components/Layout'
import StatCard from '../../components/StatCard'
import EmptyState from '../../components/EmptyState'
import TicketCard from '../../components/TicketCard'
import { PageSkeleton } from '../../components/Skeleton'
import { getAdminSummary, getSlaPorArea } from '../../services/dashboardService'
import type { AdminSummary, SlaArea } from '../../services/dashboardService'
import { formatDuracion } from '../../utils/fechas'
import { useToast } from '../../hooks/useToast'

const thClass = 'px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase'
const tdClass = 'px-4 py-2 text-sm text-gray-700 dark:text-gray-300'

// Número destacado en rojo cuando hay vencidos
const Vencidos = ({ n }: { n: number }) => (
  <span className={n > 0 ? 'text-red-600 dark:text-red-400 font-medium' : ''}>{n}</span>
)

function AdminDashboard() {
  const { toast } = useToast()
  const navigate = useNavigate()
  const [summary, setSummary] = useState<AdminSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [sla, setSla] = useState<{ dias: number; areas: SlaArea[] } | null>(null)

  // El SLA se carga aparte: si falla, el resto del dashboard sigue funcionando
  useEffect(() => {
    getSlaPorArea()
      .then(setSla)
      .catch(() => toast.error('No se pudo cargar el SLA por área'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        setSummary(await getAdminSummary())
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

  const { totales, porArea, cargaPorSoporte, urgentes } = summary

  return (
    <Layout>
      <div>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">Dashboard</h2>

        {/* Contadores */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <StatCard label="Abiertos" value={totales.abiertos} color="text-blue-600 dark:text-blue-400" />
          <StatCard label="En progreso" value={totales.enProgreso} color="text-yellow-600 dark:text-yellow-400" />
          <StatCard label="Vencidos" value={totales.vencidos} color="text-red-600 dark:text-red-400" />
          <StatCard label="Críticos abiertos" value={totales.criticos} color="text-orange-600 dark:text-orange-400" />
          <StatCard label="Cerrados" value={totales.cerrados} color="text-green-600 dark:text-green-400" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Por área */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-x-auto">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white p-4 pb-2">Por área</h3>
            {porArea.length === 0 ? (
              <p className="p-4 text-sm text-gray-500 dark:text-gray-400">No hay áreas. Créalas en "Áreas".</p>
            ) : (
              <table className="w-full">
                <thead>
                  <tr>
                    <th className={thClass}>Área</th>
                    <th className={thClass}>En cola</th>
                    <th className={thClass}>En progreso</th>
                    <th className={thClass}>Vencidos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {porArea.map((fila) => (
                    <tr key={fila.area._id} className={fila.activo ? '' : 'opacity-50'}>
                      <td className={tdClass}>{fila.area.nombre}{!fila.activo && ' (inactiva)'}</td>
                      <td className={tdClass}>{fila.enCola}</td>
                      <td className={tdClass}>{fila.enProgreso}</td>
                      <td className={tdClass}><Vencidos n={fila.vencidos} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Carga por soporte */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-x-auto">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white p-4 pb-2">Carga por soporte</h3>
            {cargaPorSoporte.length === 0 ? (
              <p className="p-4 text-sm text-gray-500 dark:text-gray-400">No hay soportes activos.</p>
            ) : (
              <table className="w-full">
                <thead>
                  <tr>
                    <th className={thClass}>Soporte</th>
                    <th className={thClass}>Activos</th>
                    <th className={thClass}>Vencidos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {cargaPorSoporte.map((fila) => (
                    <tr key={fila.soporte._id}>
                      <td className={tdClass}>{fila.soporte.nombre}</td>
                      <td className={tdClass}>{fila.activos}</td>
                      <td className={tdClass}><Vencidos n={fila.vencidos} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* SLA por área: tramos terminados (movidos o cerrados) en la ventana */}
        {sla && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-x-auto mb-8">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white p-4 pb-0">SLA por área</h3>
            <p className="text-xs text-gray-400 dark:text-gray-500 px-4 pb-2">
              Tramos terminados en los últimos {sla.dias} días · tiempo en horario laboral
            </p>
            {sla.areas.length === 0 ? (
              <p className="p-4 text-sm text-gray-500 dark:text-gray-400">Todavía no hay tramos terminados en este periodo.</p>
            ) : (
              <table className="w-full">
                <thead>
                  <tr>
                    <th className={thClass}>Área</th>
                    <th className={thClass}>Tramos</th>
                    <th className={thClass}>Tiempo promedio</th>
                    <th className={thClass}>Vencidos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {sla.areas.map((fila) => (
                    <tr key={fila.areaId ?? fila.area}>
                      <td className={tdClass}>{fila.area}</td>
                      <td className={tdClass}>{fila.tramos}</td>
                      <td className={tdClass}>{formatDuracion(fila.promedioMinutos)}</td>
                      <td className={tdClass}>
                        <Vencidos n={fila.vencidos} />
                        <span className="text-gray-400 dark:text-gray-500"> ({fila.porcentajeVencidos}%)</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Urgentes */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white p-6 pb-2">Requieren atención</h3>
          <p className="text-xs text-gray-400 dark:text-gray-500 px-6 pb-4">Sin asignar o vencidos, los que vencen antes primero</p>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {urgentes.length === 0 ? (
              <EmptyState icon="✅" title="Todo al día" description="No hay tickets sin asignar ni vencidos." />
            ) : (
              urgentes.map((ticket) => (
                <TicketCard key={ticket._id} ticket={ticket} onClick={() => navigate(`/admin/tickets/${ticket._id}`)} />
              ))
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default AdminDashboard
