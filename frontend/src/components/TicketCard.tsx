import type { Ticket } from '../types'
import { TicketTimeBadge } from './TicketTimeBadge'
import { prioridadColor, estadoColor } from '../utils/ticketColors'
import { estadoLabel, prioridadLabel } from '../utils/ticketLabels'
import { formatFechaLimite } from '../utils/fechas'

// Lo mínimo para pintar una card; creador y categoría no llegan en todas las listas (ej. urgentes del dashboard)
export type TicketCardData = Pick<Ticket, '_id' | 'titulo' | 'estado' | 'prioridad' | 'fechaLimite' | 'area' | 'asignadoA'> &
  Partial<Pick<Ticket, 'creadoPor' | 'categoria'>>

interface TicketCardProps {
  ticket: TicketCardData
  onClick: () => void
  // 'equipo' (admin/soporte): creador, área y "Sin asignar" · 'usuario': sin área y solo "Atendido por"
  variante?: 'equipo' | 'usuario'
  mostrarCreador?: boolean
  acciones?: React.ReactNode // botones a la derecha (ej. Asignar); sus clicks no abren el ticket
}

function TicketCard({ ticket, onClick, variante = 'equipo', mostrarCreador = true, acciones }: TicketCardProps) {
  const esEquipo = variante === 'equipo'

  const meta = [
    mostrarCreador ? ticket.creadoPor?.nombre : undefined,
    ticket.categoria?.nombre,
    esEquipo ? `Área: ${ticket.area?.nombre ?? 'Sin área'}` : undefined,
  ].filter(Boolean).join(' · ')

  const atencion = ticket.asignadoA
    ? `${esEquipo ? 'Atiende' : 'Atendido por'}: ${ticket.asignadoA.nombre}`
    : esEquipo ? 'Sin asignar' : ''

  const detalle = [
    atencion,
    ticket.fechaLimite && ticket.estado !== 'cerrado' ? `Límite: ${formatFechaLimite(ticket.fechaLimite)}` : '',
  ].filter(Boolean).join(' · ')

  return (
    <div
      onClick={onClick}
      className="px-4 py-4 md:px-6 flex flex-col sm:flex-row sm:items-center gap-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <p className="font-medium text-gray-800 dark:text-white truncate">{ticket.titulo}</p>
          <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full ${estadoColor[ticket.estado]}`}>
            {estadoLabel[ticket.estado]}
          </span>
        </div>
        {meta && <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 truncate">{meta}</p>}
        <div className="flex flex-wrap items-center gap-2 mt-2">
          <span className={`text-xs px-2 py-0.5 rounded-full ${prioridadColor[ticket.prioridad]}`}>
            {prioridadLabel[ticket.prioridad]}
          </span>
          <TicketTimeBadge fechaLimite={ticket.fechaLimite} estado={ticket.estado} />
          {detalle && <span className="text-xs text-gray-400 dark:text-gray-500">{detalle}</span>}
        </div>
      </div>
      {acciones && (
        <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
          {acciones}
        </div>
      )}
    </div>
  )
}

export default TicketCard
