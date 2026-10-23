import { useState, useEffect } from 'react'
import { getTicketRecorrido } from '../services/ticketService'
import type { TramoRecorrido } from '../types'

interface AreaRecorridoProps {
  ticketId: string
  refreshKey?: string
}

const formatFecha = (fecha: string) =>
  new Date(fecha).toLocaleString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

// Recorrido público del ticket por las áreas (con fechas, sin nombres de soporte)
function AreaRecorrido({ ticketId, refreshKey }: AreaRecorridoProps) {
  const [recorrido, setRecorrido] = useState<TramoRecorrido[]>([])

  useEffect(() => {
    getTicketRecorrido(ticketId)
      .then(setRecorrido)
      .catch(() => setRecorrido([])) // informativo: si falla, simplemente no se muestra
  }, [ticketId, refreshKey])

  // Solo vale la pena mostrarlo si el ticket pasó por más de un área
  if (recorrido.length < 2) return null

  return (
    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Recorrido por áreas</p>
      <ol className="flex flex-wrap items-center gap-2 text-sm">
        {recorrido.map((tramo, i) => (
          <li key={`${tramo.area}-${tramo.desde}`} className="flex items-center gap-2">
            {i > 0 && <span className="text-gray-400">→</span>}
            <span
              className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
              title={`Desde ${formatFecha(tramo.desde)}`}
            >
              {tramo.area}
              <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">{formatFecha(tramo.desde)}</span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  )
}

export default AreaRecorrido
