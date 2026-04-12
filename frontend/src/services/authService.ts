import axios from 'axios'

// URL base de tu API
const API_URL = 'http://localhost:3000/api'

// Tipos TypeScript — definen la forma de los datos
export interface LoginData {
  email: string
  password: string
}

export interface User {
  id: string
  nombre: string
  email: string
  rol: 'superadmin' | 'admin' | 'soporte' | 'usuario'
}

export interface LoginResponse {
  message: string
  token: string
  user: User
}

// Función que llama al endpoint de login
export const login = async (data: LoginData): Promise<LoginResponse> => {
  const response = await axios.post(`${API_URL}/auth/login`, data)
  return response.data
}
