import type { Ticket } from '../types'

export type EstadoTicket = Ticket['estado']

// Misma tabla que el backend (backend/src/utils/ticketStatus.ts)
const TRANSICIONES: Record<EstadoTicket, EstadoTicket[]> = {
  abierto: ['en_progreso'],
  reabierto: ['en_progreso'],
  en_progreso: ['en_revision', 'esperando_usuario', 'resuelto'],
  en_revision: ['en_progreso', 'esperando_usuario', 'resuelto'],
  esperando_usuario: ['en_progreso', 'resuelto'],
  resuelto: ['cerrado', 'reabierto', 'en_progreso'],
  cerrado: [],
}

// Plazo detenido: el ticket no se vence mientras está así
export const estaEnPausa = (estado: EstadoTicket): boolean => estado === 'esperando_usuario' || estado === 'resuelto'

// Transiciones que puede hacer el soporte (confirmar o reabrir lo resuelto es del usuario creador)
export const transicionesSoporte = (estado: EstadoTicket): EstadoTicket[] =>
  TRANSICIONES[estado].filter((e) => e !== 'reabierto' && e !== 'cerrado')
