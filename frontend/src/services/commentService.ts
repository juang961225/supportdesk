import api from './api'

export interface Comment {
  _id: string
  contenido: string
  autor: {
    _id: string
    nombre: string
    rol: string
  }
  createdAt: string
}

export const getComments = async (ticketId: string): Promise<Comment[]> => {
  const response = await api.get(`/tickets/${ticketId}/comments`)
  return response.data.comments
}

export const createComment = async (
  ticketId: string,
  contenido: string
): Promise<Comment> => {
  const response = await api.post(`/tickets/${ticketId}/comments`, { contenido })
  return response.data.comment
}