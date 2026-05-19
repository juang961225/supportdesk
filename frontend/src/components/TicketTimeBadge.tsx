import { getTicketTimeStatus } from '../utils/ticketTime'
import type { TicketTimeStatus } from '../utils/ticketTime'

interface TicketTimeBadgeProps {
  fechaLimite: string | undefined
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

export function TicketTimeBadge({ fechaLimite }: TicketTimeBadgeProps) {
  const status = getTicketTimeStatus(fechaLimite)

  // Si no hay nada que mostrar (normal o noLimit), no renderiza nada.
  if (status === 'normal' || status === 'noLimit') return null

  return (
    <span className={`text-xs px-2 py-1 rounded-full ${styles[status]}`}>
      {labels[status]}
    </span>
  )
}