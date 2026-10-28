import { getTicketTimeStatus } from '../utils/ticketTime'
import type { TicketTimeStatus } from '../utils/ticketTime'
import type { SlaActual, Ticket } from '../types'

interface TicketTimeBadgeProps {
  fechaLimite: string | undefined
  estado: Ticket['estado']
  // Si llega, manda el SLA del backend ("vence pronto" = 75% del plazo laboral); si no, 24 h reales
  sla?: SlaActual | null
}

const statusDesdeSla = (sla: SlaActual | null): TicketTimeStatus => {
  if (!sla) return 'noLimit'
  if (sla.nivel === 'vencido') return 'overdue'
  return sla.nivel === 'pronto' ? 'dueSoon' : 'normal'
}

const labels: Record<TicketTimeStatus, string> = {
  overdue: 'Vencido',
  dueSoon: 'Vence pronto',
  normal: '',
  noLimit: '',
}

const styles: Record<TicketTimeStatus, string> = {
  overdue: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
  dueSoon: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
  normal: '',
  noLimit: '',
}

export function TicketTimeBadge({ fechaLimite, estado, sla }: TicketTimeBadgeProps) {
  // Un ticket cerrado ya no vence
  if (estado === 'cerrado') return null

  const status = sla !== undefined ? statusDesdeSla(sla) : getTicketTimeStatus(fechaLimite)

  // Si no hay nada que mostrar (normal o noLimit), no renderiza nada.
  if (status === 'normal' || status === 'noLimit') return null

  return (
    <span className={`text-xs px-2 py-1 rounded-full ${styles[status]}`}>
      {labels[status]}
    </span>
  )
}
