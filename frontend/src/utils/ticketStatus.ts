import type { Ticket } from '../types'

export type EstadoTicket = Ticket['estado']

// Misma tabla que el backend (backend/src/utils/ticketStatus.ts)
const TRANSICIONES: Record<EstadoTicket, EstadoTicket[]> = {
  abierto: ['en_progreso'],
  reabierto: ['en_progreso'],
  en_progreso: ['en_revision', 'cerrado'],
  en_revision: ['en_progreso', 'cerrado'],
  cerrado: ['reabierto'],
}

// Transiciones que puede hacer el soporte (reabrir es solo del usuario creador)
export const transicionesSoporte = (estado: EstadoTicket): EstadoTicket[] =>
  TRANSICIONES[estado].filter((e) => e !== 'reabierto')
