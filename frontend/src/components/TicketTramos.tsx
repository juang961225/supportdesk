import { useState, useEffect } from 'react'
import { getTicketTramos } from '../services/historyService'
import { useToast } from '../hooks/useToast'
import { formatFechaLimite } from '../utils/fechas'
import { formatTiempoLaboral } from '../utils/sla'
import type { Tramo } from '../types'
import { SkeletonLines } from './Skeleton'

interface TicketTramosProps {
  ticketId: string
  // Cambia cuando la página modifica el ticket (mover, cerrar, fecha límite) para recalcular
  refreshKey?: string
}

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
  const [minutosJornada, setMinutosJornada] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchTramos = async () => {
      try {
        const datos = await getTicketTramos(ticketId)
        setTramos(datos.tramos)
        setMinutosJornada(datos.minutosJornada)
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
        <>
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {tramos.map((tramo) => (
              <li key={tramo.entrada} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-gray-800 dark:text-white truncate">{tramo.area}</p>
                  <EstadoTramo tramo={tramo} />
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                  {formatTiempoLaboral(tramo.minutosLaborales, minutosJornada, false)}
                </p>
                <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-2 text-xs text-gray-500 dark:text-gray-400 mt-1">
                  <dt>Entrada</dt>
                  <dd>{formatFechaLimite(tramo.entrada)}</dd>
                  <dt>Salida</dt>
                  <dd>{tramo.salida ? formatFechaLimite(tramo.salida) : '—'}</dd>
                  <dt>Límite</dt>
                  <dd>{tramo.fechaLimite ? formatFechaLimite(tramo.fechaLimite) : '—'}</dd>
                </dl>
              </li>
            ))}
          </ul>
          {tramos.length > 1 && (
            <p className="flex justify-between gap-2 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-800 dark:text-white">
              <span>Total</span>
              <span>{formatTiempoLaboral(total, minutosJornada, false)}</span>
            </p>
          )}
        </>
      )}
    </div>
  )
}

export default TicketTramos
