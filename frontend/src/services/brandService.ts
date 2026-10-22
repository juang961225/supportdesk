import api from './api'
import type { Brand } from '../types'

export type { Brand }

export const getBrands = async (): Promise<Brand[]> => {
  const response = await api.get('/brands')
  return response.data.brands
}

export const createBrand = async (nombre: string): Promise<Brand> => {
  const response = await api.post('/brands', { nombre })
  return response.data.brand
}
export const updateBrand = async (
  id: string,
  data: { nombre?: string; estado?: Brand['estado'] }
): Promise<Brand> => {
  const response = await api.put(`/brands/${id}`, data)
  return response.data.brand
}
