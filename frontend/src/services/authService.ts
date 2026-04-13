import api from './api'
import type { User } from '../types'

export interface LoginData {
  email: string
  password: string
}

export interface LoginResponse {
  message: string
  token: string
  user: User
}

export const login = async (data: LoginData): Promise<LoginResponse> => {
  const response = await api.post('/auth/login', data)
  return response.data
}