import mongoose from 'mongoose'
import Brand from '../models/Brand'
import { HorarioLaboral, HORARIO_POR_DEFECTO } from '../utils/horarioLaboral'
import Area from '../models/Area'
import { Plazos, calcularFechaLimite, fechaTrasPausa, resolverPlazos } from '../utils/fechaLimite'
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

// Plazos base de la marca. Se consultan solo al calcular una fecha límite o abrir la configuración: sin caché
export const plazosDeMarca = async (marcaId: mongoose.Types.ObjectId | string): Promise<Plazos> => {
  const marca = await Brand.findById(marcaId).select('plazos').lean()
  return resolverPlazos(marca?.plazos)
}

// Fecha límite de un ticket en esa área: plazos de la marca con el ajuste del área, en tiempo laboral desde `desde`
export const fechaLimiteDeTicket = async (
  marcaId: mongoose.Types.ObjectId | string,
  areaId: mongoose.Types.ObjectId | string | undefined,
  prioridad: string,
  desde: Date = new Date()
): Promise<Date> => {
  const [horario, marca, area] = await Promise.all([
    horarioDeMarca(marcaId),
    Brand.findById(marcaId).select('plazos').lean(),
    areaId ? Area.findById(areaId).select('plazos').lean() : null
  ])
  return calcularFechaLimite(prioridad, horario, desde, resolverPlazos(marca?.plazos, area?.plazos))
}

// Corre la fecha límite al salir de una pausa. Devuelve la anterior si cambió, para registrarla en el historial
export const reanudarPlazo = async (ticket: {
  marca: mongoose.Types.ObjectId
  fechaLimite?: Date
  pausadoDesde?: Date
}): Promise<Date | undefined> => {
  const { fechaLimite, pausadoDesde } = ticket
  ticket.pausadoDesde = undefined
  if (!fechaLimite || !pausadoDesde) return undefined
  const nueva = fechaTrasPausa(fechaLimite, pausadoDesde, new Date(), await horarioDeMarca(ticket.marca))
  if (nueva.getTime() === fechaLimite.getTime()) return undefined
  ticket.fechaLimite = nueva
  return fechaLimite
}
