import api from './api'
import type { TicketEvent, Tramo } from '../types'

export const getTicketHistory = async (ticketId: string): Promise<TicketEvent[]> => {
  const response = await api.get(`/tickets/${ticketId}/history`)
  return response.data.eventos
}

// Tramos por área con tiempo laboral y si se venció en cada uno (admin, soporte, superadmin)
export const getTicketTramos = async (ticketId: string): Promise<Tramo[]> => {
  const response = await api.get(`/tickets/${ticketId}/tramos`)
  return response.data.tramos
}
