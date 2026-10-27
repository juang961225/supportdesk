import mongoose from 'mongoose'
import Brand from '../models/Brand'
import { HorarioLaboral, HORARIO_POR_DEFECTO } from '../utils/horarioLaboral'
import { calcularFechaLimite } from '../utils/fechaLimite'

// Horario de la marca; las marcas creadas antes de F2-4 (o sin días guardados) usan el horario por defecto
export const horarioDeMarca = async (marcaId: mongoose.Types.ObjectId | string): Promise<HorarioLaboral> => {
  const marca = await Brand.findById(marcaId).select('horario').lean()
  const horario = marca?.horario
  if (!horario?.dias?.length || !horario.inicio || !horario.fin) return HORARIO_POR_DEFECTO
  return { dias: horario.dias, inicio: horario.inicio, fin: horario.fin, festivos: horario.festivos ?? [] }
}

// Fecha límite de un ticket de esa marca, en tiempo laboral desde `desde`
export const fechaLimiteDeMarca = async (
  marcaId: mongoose.Types.ObjectId | string,
  prioridad: string,
  desde: Date = new Date()
): Promise<Date> => calcularFechaLimite(prioridad, await horarioDeMarca(marcaId), desde)
