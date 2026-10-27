import api from './api'
import type { HorarioLaboral } from '../types'

export const getHorario = async (): Promise<HorarioLaboral> => {
  const response = await api.get('/horario')
  return response.data.horario
}

export const updateHorario = async (horario: HorarioLaboral): Promise<HorarioLaboral> => {
  const response = await api.put('/horario', horario)
  return response.data.horario
}
