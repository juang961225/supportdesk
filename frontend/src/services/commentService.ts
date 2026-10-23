import api from './api'
import type { Attachment } from '../types'

export interface Comment {
  _id: string
  contenido: string
  autor: {
    _id: string
    nombre: string
    rol: string
  }
  archivos: Attachment[]
  createdAt: string
}

export const getComments = async (ticketId: string): Promise<Comment[]> => {
  const response = await api.get(`/tickets/${ticketId}/comments`)
  return response.data.comments
}

// multipart/form-data: el texto y hasta 5 archivos en el campo "archivos"
export const createComment = async (
  ticketId: string,
  contenido: string,
  archivos: File[] = []
): Promise<Comment> => {
  const data = new FormData()
  data.append('contenido', contenido)
  archivos.forEach((archivo) => data.append('archivos', archivo))
  const response = await api.post(`/tickets/${ticketId}/comments`, data)
  return response.data.comment
}