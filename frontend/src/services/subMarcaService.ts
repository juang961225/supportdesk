import api from './api'
import type { SubMarca } from '../types'

// El backend responde según el rol: superadmin todas, admin las de su marca,
// soporte las activas de su marca y usuario las suyas activas
export const getSubMarcas = async (): Promise<SubMarca[]> => {
  const response = await api.get('/submarcas')
  return response.data.submarcas
}

export const createSubMarca = async (nombre: string): Promise<SubMarca> => {
  const response = await api.post('/submarcas', { nombre })
  return response.data.submarca
}

export const updateSubMarca = async (id: string, nombre: string): Promise<SubMarca> => {
  const response = await api.put(`/submarcas/${id}`, { nombre })
  return response.data.submarca
}

export const updateSubMarcaEstado = async (id: string, activo: boolean): Promise<SubMarca> => {
  const response = await api.patch(`/submarcas/${id}/estado`, { activo })
  return response.data.submarca
}
