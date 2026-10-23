import type { Ticket } from '../types'

// Etiquetas legibles para los estados (en_progreso → "En progreso")
export const estadoLabel: Record<Ticket['estado'], string> = {
  abierto: 'Abierto',
  en_progreso: 'En progreso',
  en_revision: 'En revisión',
  cerrado: 'Cerrado',
  reabierto: 'Reabierto',
}

// Para valores que llegan como string sin tipar (ej. eventos del historial)
export const labelDeEstado = (estado: string | undefined): string =>
  estado && estado in estadoLabel ? estadoLabel[estado as Ticket['estado']] : estado ?? ''
