export type TicketTimeStatus = 'normal' | 'dueSoon' | 'overdue' | 'noLimit'

/**
 * Determina el estado de tiempo de un ticket según su fecha límite.
 *
 * - 'noLimit': el ticket no tiene fecha límite definida.
 * - 'overdue': la fecha límite ya pasó (vencido).
 * - 'dueSoon': vence en las próximas 24 horas.
 * - 'normal': vence en más de 24 horas.
 */
export function getTicketTimeStatus(
  fechaLimite: string | undefined
): TicketTimeStatus {
  if (!fechaLimite) return 'noLimit'

  const ahora = Date.now()
  const limite = new Date(fechaLimite).getTime()
  const diferenciaMs = limite - ahora

  if (diferenciaMs < 0) return 'overdue'

  const HORAS_24_EN_MS = 24 * 60 * 60 * 1000
  if (diferenciaMs <= HORAS_24_EN_MS) return 'dueSoon'

  return 'normal'
}