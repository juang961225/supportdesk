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

// El backend además deja la cookie httpOnly de sesión (refresh token)
export const login = async (data: LoginData): Promise<LoginResponse> => {
  const response = await api.post('/auth/login', data)
  return response.data
}

// Invalida la cookie de sesión en el backend
export const logoutServidor = async (): Promise<void> => {
  await api.post('/auth/logout')
}
