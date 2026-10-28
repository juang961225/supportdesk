import mongoose from 'mongoose'
import Brand from '../models/Brand'
import { HorarioLaboral, HORARIO_POR_DEFECTO } from '../utils/horarioLaboral'
import { calcularFechaLimite } from '../utils/fechaLimite'
import { CacheMemoria } from './cacheMemoria'

// El horario casi nunca cambia y se usa en cada lista (SLA): 60 s en memoria, se borra al guardarlo
const horarios = new CacheMemoria<HorarioLaboral>(60 * 1000)

export const invalidarHorario = (marcaId: string): void => horarios.borrar(marcaId)

// Horario de la marca; las marcas creadas antes de F2-4 (o sin días guardados) usan el horario por defecto
export const horarioDeMarca = (marcaId: mongoose.Types.ObjectId | string): Promise<HorarioLaboral> =>
  horarios.obtenerOCalcular(String(marcaId), () => leerHorario(marcaId))

const leerHorario = async (marcaId: mongoose.Types.ObjectId | string): Promise<HorarioLaboral> => {
  const marca = await Brand.findById(marcaId).select('horario').lean()
  const horario = marca?.horario
  if (!horario?.dias?.length || !horario.inicio || !horario.fin) return HORARIO_POR_DEFECTO
  const pausa = horario.pausa?.inicio && horario.pausa?.fin ? { inicio: horario.pausa.inicio, fin: horario.pausa.fin } : null
  return { dias: horario.dias, inicio: horario.inicio, fin: horario.fin, pausa, festivos: horario.festivos ?? [] }
}

// Fecha límite de un ticket de esa marca, en tiempo laboral desde `desde`
export const fechaLimiteDeMarca = async (
  marcaId: mongoose.Types.ObjectId | string,
  prioridad: string,
  desde: Date = new Date()
): Promise<Date> => calcularFechaLimite(prioridad, await horarioDeMarca(marcaId), desde)
