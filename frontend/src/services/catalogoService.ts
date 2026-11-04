import api from './api'
import type { CatalogoContexto, FiltrosContexto, MiContexto } from '../types'

// Admin: opciones para asignar a un usuario. `disponible` es false si la marca no usa el catálogo de Online Brief
export const getCatalogoContexto = async (): Promise<CatalogoContexto> => {
  const response = await api.get('/catalogos/contexto')
  return response.data
}

// Usuario: lo que puede elegir al crear un ticket
export const getMiContexto = async (): Promise<MiContexto> => {
  const response = await api.get('/catalogos/mi-contexto')
  return response.data
}

// Admin, superadmin y soporte: valores para filtrar la lista de tickets
export const getFiltrosContexto = async (): Promise<FiltrosContexto> => {
  const response = await api.get('/catalogos/filtros')
  return response.data
}
