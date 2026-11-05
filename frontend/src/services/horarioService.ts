import api from './api'
import type { HorarioLaboral, Plazos } from '../types'

export const getHorario = async (): Promise<HorarioLaboral> => {
  const response = await api.get('/horario')
  return response.data.horario
}

export const updateHorario = async (horario: HorarioLaboral): Promise<HorarioLaboral> => {
  const response = await api.put('/horario', horario)
  return response.data.horario
}

export const getPlazos = async (): Promise<Plazos> => {
  const response = await api.get('/horario/plazos')
  return response.data.plazos
}

export const updatePlazos = async (plazos: Plazos): Promise<Plazos> => {
  const response = await api.put('/horario/plazos', plazos)
  return response.data.plazos
}
