import { ITicket } from '../models/Ticket'

export type EstadoTicket = ITicket['estado']

// Flujo de estados permitido — única fuente de verdad del backend.
// Soporte resuelve; el creador confirma (cerrado) o reabre. Un ticket cerrado no se reabre: se crea uno nuevo.
const TRANSICIONES: Record<EstadoTicket, EstadoTicket[]> = {
  abierto: ['en_progreso'],
  reabierto: ['en_progreso'],
  en_progreso: ['en_revision', 'esperando_usuario', 'resuelto'],
  en_revision: ['en_progreso', 'esperando_usuario', 'resuelto'],
  esperando_usuario: ['en_progreso', 'resuelto'],
  resuelto: ['cerrado', 'reabierto', 'en_progreso'],
  cerrado: [],
}

// En estos estados el plazo está detenido (al salir, la fecha límite se corre lo que duró la pausa)
export const ESTADOS_EN_PAUSA: EstadoTicket[] = ['esperando_usuario', 'resuelto']
// Sin plazo corriendo: no hay barra de SLA ni pueden vencerse
export const ESTADOS_SIN_RELOJ: EstadoTicket[] = [...ESTADOS_EN_PAUSA, 'cerrado']

export const esEstadoValido = (estado: unknown): estado is EstadoTicket =>
  typeof estado === 'string' && estado in TRANSICIONES

export const puedeTransicionar = (de: EstadoTicket, a: EstadoTicket): boolean =>
  TRANSICIONES[de].includes(a)

// Aplica el nuevo estado y sus efectos (fecha de cierre y pausa).
// Punto único de cambio de estado (el controller registra el evento en el historial).
export const aplicarEstado = (ticket: ITicket, nuevo: EstadoTicket): void => {
  ticket.estado = nuevo
  if (nuevo === 'cerrado') ticket.fechaCierre = new Date()
  if (nuevo === 'reabierto') ticket.fechaCierre = undefined
  if (ESTADOS_EN_PAUSA.includes(nuevo)) {
    if (!ticket.pausadoDesde) ticket.pausadoDesde = new Date()
  } else {
    ticket.pausadoDesde = undefined
  }
}
