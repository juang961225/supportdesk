import api from './api'
import type { TicketEvent, Tramo } from '../types'

export const getTicketHistory = async (ticketId: string): Promise<TicketEvent[]> => {
  const response = await api.get(`/tickets/${ticketId}/history`)
  return response.data.eventos
}

// Tramos por área con tiempo laboral y si se venció en cada uno (admin, soporte, superadmin)
// minutosJornada: jornada de la marca, para mostrar los tiempos en días laborales
export const getTicketTramos = async (ticketId: string): Promise<{ tramos: Tramo[]; minutosJornada: number }> => {
  const response = await api.get(`/tickets/${ticketId}/tramos`)
  return { tramos: response.data.tramos, minutosJornada: response.data.minutosJornada ?? 0 }
}
