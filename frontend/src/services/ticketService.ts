import axios from 'axios'
import api from './api'
import type { Ticket, TramoRecorrido, Paginado, FiltrosTicket } from '../types'
import { filtrosParaApi } from '../utils/ticketFilters'

export type { Ticket }

export const getTickets = async (filtros?: FiltrosTicket): Promise<Ticket[]> => {
  const response = await api.get('/tickets', { params: filtros ? filtrosParaApi(filtros) : undefined })
  return response.data.tickets
}

export const getTicketsPage = async (page: number, filtros?: FiltrosTicket): Promise<Paginado<Ticket>> => {
  const response = await api.get('/tickets', { params: { page, ...(filtros ? filtrosParaApi(filtros) : {}) } })
  return { items: response.data.tickets, pagination: response.data.pagination }
}

export const getTicketById = async (id: string): Promise<Ticket> => {
  const response = await api.get(`/tickets/${id}`)
  return response.data.ticket
}

// multipart/form-data: campos del ticket, observadores y hasta 5 archivos
export const createTicket = async (data: {
  titulo: string
  descripcion: string
  prioridad: string
  categoriaId: string
  observadorIds?: string[]
  archivos?: File[]
}): Promise<Ticket> => {
  const form = new FormData()
  form.append('titulo', data.titulo)
  form.append('descripcion', data.descripcion)
  form.append('prioridad', data.prioridad)
  form.append('categoriaId', data.categoriaId)
  data.observadorIds?.forEach((id) => form.append('observadorIds', id))
  data.archivos?.forEach((archivo) => form.append('archivos', archivo))
  const response = await api.post('/tickets', form)
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

// Solo admin: ajusta la fecha límite actual (ISO) con un motivo que queda en el historial
export const updateFechaLimite = async (ticketId: string, fechaLimite: string, motivo: string): Promise<Ticket> => {
  const response = await api.put(`/tickets/${ticketId}/fecha-limite`, { fechaLimite, motivo })
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

export type FormatoExportacion = 'xlsx' | 'pdf'

const dosDigitos = (n: number): string => String(n).padStart(2, '0')

// Admin y superadmin: descarga la lista con los filtros actuales (todas las páginas) en Excel o PDF
export const exportarTickets = async (formato: FormatoExportacion, filtros: FiltrosTicket): Promise<void> => {
  const response = await api.get<Blob>('/tickets/exportar', {
    params: { formato, ...filtrosParaApi(filtros) },
    responseType: 'blob',
  })
  const hoy = new Date()
  const nombre = `tickets-${hoy.getFullYear()}-${dosDigitos(hoy.getMonth() + 1)}-${dosDigitos(hoy.getDate())}.${formato}`

  const url = URL.createObjectURL(response.data)
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = nombre
  document.body.appendChild(enlace)
  enlace.click()
  enlace.remove()
  URL.revokeObjectURL(url)
}

// Con responseType 'blob' el mensaje de error del backend también llega como Blob
export const mensajeDeErrorBlob = async (err: unknown, porDefecto: string): Promise<string> => {
  if (!axios.isAxiosError(err) || !(err.response?.data instanceof Blob)) return porDefecto
  try {
    const cuerpo: unknown = JSON.parse(await err.response.data.text())
    return typeof cuerpo === 'object' && cuerpo !== null && 'message' in cuerpo && typeof cuerpo.message === 'string'
      ? cuerpo.message
      : porDefecto
  } catch {
    return porDefecto
  }
}
