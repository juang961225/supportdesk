import { ITicket } from '../models/Ticket'

export type EstadoTicket = ITicket['estado']

// Flujo de estados permitido — única fuente de verdad del backend
const TRANSICIONES: Record<EstadoTicket, EstadoTicket[]> = {
  abierto: ['en_progreso'],
  reabierto: ['en_progreso'],
  en_progreso: ['en_revision', 'cerrado'],
  en_revision: ['en_progreso', 'cerrado'],
  cerrado: ['reabierto'],
}

export const esEstadoValido = (estado: unknown): estado is EstadoTicket =>
  typeof estado === 'string' && estado in TRANSICIONES

export const puedeTransicionar = (de: EstadoTicket, a: EstadoTicket): boolean =>
  TRANSICIONES[de].includes(a)

// Aplica el nuevo estado y sus efectos (fecha de cierre).
// Punto único de cambio de estado (el controller registra el evento en el historial).
export const aplicarEstado = (ticket: ITicket, nuevo: EstadoTicket): void => {
  ticket.estado = nuevo
  if (nuevo === 'cerrado') ticket.fechaCierre = new Date()
  if (nuevo === 'reabierto') ticket.fechaCierre = undefined
}
