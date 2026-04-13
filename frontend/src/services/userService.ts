import api from './api'
import type { User } from '../types'

export type { User }

export const getUsers = async (): Promise<User[]> => {
  const response = await api.get('/auth/users')
  return response.data.users
}

export const createUser = async (data: {
  nombre: string
  email: string
  password: string
  rol: string
  marcaId?: string
}): Promise<User> => {
  const response = await api.post('/auth/create-user', data)
  return response.data.user
}