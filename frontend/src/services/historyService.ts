import api from './api'
import type { TicketEvent } from '../types'

export const getTicketHistory = async (ticketId: string): Promise<TicketEvent[]> => {
  const response = await api.get(`/tickets/${ticketId}/history`)
  return response.data.eventos
}
