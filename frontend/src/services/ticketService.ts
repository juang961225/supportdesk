import api from './api'
import type { Ticket, TramoRecorrido } from '../types'

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
  observadorIds?: string[]
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
export const takeTicket = async (ticketId: string): Promise<Ticket> => {
  const response = await api.post(`/tickets/${ticketId}/take`)
  return response.data.ticket
}

export const releaseTicket = async (ticketId: string): Promise<Ticket> => {
  const response = await api.post(`/tickets/${ticketId}/release`)
  return response.data.ticket
}

export const moveTicket = async (ticketId: string, areaId: string): Promise<Ticket> => {
  const response = await api.put(`/tickets/${ticketId}/move`, { areaId })
  return response.data.ticket
}

export const getTicketRecorrido = async (ticketId: string): Promise<TramoRecorrido[]> => {
  const response = await api.get(`/tickets/${ticketId}/recorrido`)
  return response.data.recorrido
}

export const addObserver = async (ticketId: string, userId: string): Promise<Ticket> => {
  const response = await api.post(`/tickets/${ticketId}/observers`, { userId })
  return response.data.ticket
}

// Devuelve null cuando el propio usuario se sale (ya no puede ver el ticket)
export const removeObserver = async (ticketId: string, userId: string): Promise<Ticket | null> => {
  const response = await api.delete(`/tickets/${ticketId}/observers/${userId}`)
  return response.data.ticket
}
