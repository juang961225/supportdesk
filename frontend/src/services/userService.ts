import api from './api'
import type { User } from '../types'

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
