import api from './api'
import type { Ticket } from '../types'

export type { Ticket }

export const getTickets = async (): Promise<Ticket[]> => {
  const response = await api.get('/tickets')
  return response.data.tickets
}

export const getTicketById = async (id: string): Promise<Ticket> => {
  const response = await api.get(`/tickets/${id}`)
  return response.data.ticket
}

export const createTicket = async (data: {
  titulo: string
  descripcion: string
  prioridad: string
  categoriaId: string
}): Promise<Ticket> => {
  const response = await api.post('/tickets', data)
  return response.data.ticket
}

export const assignTicket = async (ticketId: string, soporterId: string): Promise<Ticket> => {
  const response = await api.put(`/tickets/${ticketId}/assign`, { soporterId })
  return response.data.ticket
}

export const updateTicketStatus = async (ticketId: string, estado: string): Promise<Ticket> => {
  const response = await api.put(`/tickets/${ticketId}/status`, { estado })
  return response.data.ticket
}