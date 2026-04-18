import api from './api'

export interface Ticket {
  _id: string
  titulo: string
  descripcion: string
  estado: 'abierto' | 'en_progreso' | 'en_revision' | 'cerrado' | 'reabierto'
  prioridad: 'baja' | 'media' | 'alta' | 'critica'
  categoria: {
    _id: string
    nombre: string
  }
  creadoPor: {
    _id: string
    nombre: string
    email: string
  }
  asignadoA?: {
    _id: string
    nombre: string
    email: string
  }
  marca: {
    _id: string
    nombre: string
  }
  archivos: string[]
  fechaLimite?: string
  fechaCierre?: string
  createdAt: string
}

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