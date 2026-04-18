import api from './api'

export interface Category {
  _id: string
  nombre: string
  descripcion?: string
  activo: boolean
  marca: string
}

export const getCategories = async (): Promise<Category[]> => {
  const response = await api.get('/categories')
  return response.data.categories
}

export const createCategory = async (data: {
  nombre: string
  descripcion?: string
}): Promise<Category> => {
  const response = await api.post('/categories', data)
  return response.data.category
}

export const updateCategory = async (id: string, data: {
  nombre?: string
  descripcion?: string
  activo?: boolean
}): Promise<Category> => {
  const response = await api.put(`/categories/${id}`, data)
  return response.data.category
}