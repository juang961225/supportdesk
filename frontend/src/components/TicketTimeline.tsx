import { useState, useEffect } from 'react'
import { getTicketHistory } from '../services/historyService'
import { useToast } from '../hooks/useToast'
import { labelDeEstado } from '../utils/ticketLabels'
import type { TicketEvent } from '../types'

interface TicketTimelineProps {
  ticketId: string
  // Cambia cuando la página modifica el ticket (estado, asignación) para recargar el historial
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

// Texto de cada evento: "<autor> <acción>"
const describirEvento = (evento: TicketEvent): string => {
  const autor = evento.autor?.nombre ?? 'Sistema'

  switch (evento.tipo) {
    case 'creado':
      return `${autor} creó el ticket`
    case 'asignado':
      return evento.sintetico
        ? `Asignado a ${evento.aNombre}`
        : `${autor} asignó el ticket a ${evento.aNombre}`
    case 'reasignado':
      return `${autor} reasignó el ticket de ${evento.deNombre ?? 'otro soporte'} a ${evento.aNombre}`
    case 'estado':
      return evento.a === 'reabierto'
        ? `${autor} reabrió el ticket`
        : `${autor} cambió el estado: ${labelDeEstado(evento.de)} → ${labelDeEstado(evento.a)}`
    case 'desasignado':
      return `${autor} quitó la asignación a ${evento.deNombre}${evento.motivo ? ` (${evento.motivo})` : ''}; el ticket volvió a Abierto`
    case 'tomado':
      return `${autor} tomó el ticket de la cola`
    case 'soltado':
      return `${autor} soltó el ticket; volvió a la cola`
    case 'pasado':
      return `${autor} pasó el ticket a ${evento.aNombre}`
    case 'movido':
      return `${autor} movió el ticket de ${evento.deNombre ?? 'su área'} a ${evento.aNombre}; quedó sin asignar en la cola`
  }
}

const dotColor: Record<TicketEvent['tipo'], string> = {
  creado: 'bg-gray-400',
  asignado: 'bg-blue-500',
  reasignado: 'bg-blue-500',
  estado: 'bg-yellow-500',
  desasignado: 'bg-red-500',
  tomado: 'bg-blue-500',
  soltado: 'bg-red-500',
  pasado: 'bg-blue-500',
  movido: 'bg-purple-500',
}

// Historial interno del ticket — solo admin, soporte y superadmin
function TicketTimeline({ ticketId, refreshKey }: TicketTimelineProps) {
  const { toast } = useToast()
  const [eventos, setEventos] = useState<TicketEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setEventos(await getTicketHistory(ticketId))
      } catch {
        toast.error('No se pudo cargar el historial')
      } finally {
        setIsLoading(false)
      }
    }
    fetchHistory()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId, refreshKey])

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-4">
      <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-1">
        Historial interno
      </h3>
      <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
        Solo visible para admin y soporte
      </p>

      {isLoading ? (
        <p className="text-gray-500 dark:text-gray-400 text-sm">Cargando historial...</p>
      ) : eventos.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400 text-sm">Sin historial</p>
      ) : (
        <ol className="relative border-l border-gray-200 dark:border-gray-700 ml-1 space-y-4">
          {eventos.map((evento) => (
            <li key={evento._id} className="ml-4">
              <span className={`absolute -left-1.5 mt-1.5 w-3 h-3 rounded-full ${dotColor[evento.tipo]}`} />
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {describirEvento(evento)}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                {evento.createdAt ? formatFecha(evento.createdAt) : 'Fecha no registrada'}
                {evento.sintetico && ' · registro anterior al historial'}
              </p>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

export default TicketTimeline
