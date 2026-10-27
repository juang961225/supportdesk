import { useState, useEffect } from 'react'
import { getTicketTramos } from '../services/historyService'
import { useToast } from '../hooks/useToast'
import { formatFechaLimite, formatDuracion } from '../utils/fechas'
import type { Tramo } from '../types'
import { SkeletonLines } from './Skeleton'

interface TicketTramosProps {
  ticketId: string
  // Cambia cuando la página modifica el ticket (mover, cerrar, fecha límite) para recalcular
  refreshKey?: string
}

const thClass = 'px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase whitespace-nowrap'
const tdClass = 'px-3 py-2 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap'

const EstadoTramo = ({ tramo }: { tramo: Tramo }) => {
  if (tramo.vencido === true) {
    return <span className="text-xs px-2 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">Vencido</span>
  }
  if (tramo.vencido === null) {
    return <span className="text-xs text-gray-400 dark:text-gray-500">Sin fecha límite</span>
  }
  return tramo.salida ? (
    <span className="text-xs px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">A tiempo</span>
  ) : (
    <span className="text-xs px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">En curso</span>
  )
}

// Tiempo del ticket en cada área (horario laboral, sin contar el tiempo cerrado) y si venció — admin y soporte
function TicketTramos({ ticketId, refreshKey }: TicketTramosProps) {
  const { toast } = useToast()
  const [tramos, setTramos] = useState<Tramo[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchTramos = async () => {
      try {
        setTramos(await getTicketTramos(ticketId))
      } catch {
        toast.error('No se pudieron cargar los tiempos por área')
      } finally {
        setIsLoading(false)
      }
    }
    fetchTramos()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId, refreshKey])

  const total = tramos.reduce((suma, t) => suma + t.minutosLaborales, 0)

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-4">
      <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-1">Tiempo por área</h3>
      <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
        En horario laboral; no cuenta el tiempo cerrado. Solo visible para admin y soporte
      </p>

      {isLoading ? (
        <SkeletonLines count={2} />
      ) : tramos.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400 text-sm">Sin datos</p>
      ) : (
        <div className="overflow-x-auto -mx-3">
          <table className="w-full">
            <thead>
              <tr>
                <th className={thClass}>Área</th>
                <th className={thClass}>Entrada</th>
                <th className={thClass}>Salida</th>
                <th className={thClass}>Tiempo</th>
                <th className={thClass}>Fecha límite</th>
                <th className={thClass}>SLA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {tramos.map((tramo) => (
                <tr key={tramo.entrada}>
                  <td className={`${tdClass} font-medium`}>{tramo.area}</td>
                  <td className={tdClass}>{formatFechaLimite(tramo.entrada)}</td>
                  <td className={tdClass}>{tramo.salida ? formatFechaLimite(tramo.salida) : '—'}</td>
                  <td className={tdClass}>{formatDuracion(tramo.minutosLaborales)}</td>
                  <td className={tdClass}>{tramo.fechaLimite ? formatFechaLimite(tramo.fechaLimite) : '—'}</td>
                  <td className={tdClass}><EstadoTramo tramo={tramo} /></td>
                </tr>
              ))}
            </tbody>
            {tramos.length > 1 && (
              <tfoot>
                <tr className="border-t border-gray-200 dark:border-gray-700">
                  <td className={`${tdClass} font-medium`} colSpan={3}>Total</td>
                  <td className={`${tdClass} font-medium`} colSpan={3}>{formatDuracion(total)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
    </div>
  )
}

export default TicketTramos
