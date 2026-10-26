import api from './api'
import type { User, UserRef, Paginado } from '../types'

export type { User }

export interface UpdateUserData {
  nombre?: string
  email?: string
  password?: string
  estado?: User['estado']
  rol?: User['rol']
  marcaId?: string
  areaIds?: string[]
}

export const getUsers = async (): Promise<User[]> => {
  const response = await api.get('/users')
  return response.data.users
}

export const getUsersPage = async (page: number): Promise<Paginado<User>> => {
  const response = await api.get('/users', { params: { page } })
  return { items: response.data.users, pagination: response.data.pagination }
}

export const createUser = async (data: {
  nombre: string
  email: string
  password: string
  rol: string
  marcaId?: string
  areaIds?: string[]
}): Promise<User> => {
  const response = await api.post('/users', data)
  return response.data.user
}

export const updateUser = async (id: string, data: UpdateUserData): Promise<User> => {
  const response = await api.patch(`/users/${id}`, data)
  return response.data.user
}

// Autocompletado: usuarios activos de la marca cuyo nombre o email contiene el texto (mín. 2 letras)
export const searchUsers = async (q: string): Promise<UserRef[]> => {
  const response = await api.get('/users/search', { params: { q } })
  return response.data.users
}
