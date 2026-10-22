import api from './api'
import type { Area, User } from '../types'

export type { Area }

export const getAreas = async (): Promise<Area[]> => {
  const response = await api.get('/areas')
  return response.data.areas
}

export const createArea = async (data: { nombre: string; descripcion?: string }): Promise<Area> => {
  const response = await api.post('/areas', data)
  return response.data.area
}

export const updateArea = async (id: string, data: { nombre?: string; descripcion?: string }): Promise<Area> => {
  const response = await api.put(`/areas/${id}`, data)
  return response.data.area
}

export const updateAreaEstado = async (id: string, activo: boolean): Promise<Area> => {
  const response = await api.patch(`/areas/${id}/estado`, { activo })
  return response.data.area
}

export const getAreaSoportes = async (id: string): Promise<User[]> => {
  const response = await api.get(`/areas/${id}/soportes`)
  return response.data.soportes
}
