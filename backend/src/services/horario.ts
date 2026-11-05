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

// Plazo del ticket: lo que se promete al cliente, con los plazos de la marca
export const fechaLimiteDelTicket = async (
  marcaId: mongoose.Types.ObjectId | string,
  prioridad: string,
  desde: Date = new Date()
): Promise<Date> => {
  const [horario, plazos] = await Promise.all([horarioDeMarca(marcaId), plazosDeMarca(marcaId)])
  return calcularFechaLimite(prioridad, horario, desde, plazos)
}

// Plazo del tramo: los de la marca con el ajuste del área
export const fechaLimiteDeArea = async (
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

export interface CambioPorPausa {
  fechaLimiteAnterior?: Date
  fechaLimiteAreaAnterior?: Date
  fechaLimiteNueva?: Date
}

// Corre los dos plazos al salir de una pausa. Devuelve lo que cambió, para registrarlo en el historial
export const reanudarPlazo = async (ticket: {
  marca: mongoose.Types.ObjectId
  prioridad: string
  fechaLimite?: Date
  fechaLimiteArea?: Date
  pausadoDesde?: Date
}): Promise<CambioPorPausa> => {
  const { fechaLimite, fechaLimiteArea, pausadoDesde, prioridad } = ticket
  ticket.pausadoDesde = undefined
  if (!pausadoDesde) return {}
  const horario = await horarioDeMarca(ticket.marca)
  const ahora = new Date()
  const cambio: CambioPorPausa = {}
  if (fechaLimite) {
    const nueva = fechaTrasPausa(fechaLimite, pausadoDesde, ahora, horario, prioridad)
    if (nueva.getTime() !== fechaLimite.getTime()) {
      ticket.fechaLimite = nueva
      cambio.fechaLimiteAnterior = fechaLimite
      cambio.fechaLimiteNueva = nueva
    }
  }
  if (fechaLimiteArea) {
    const nueva = fechaTrasPausa(fechaLimiteArea, pausadoDesde, ahora, horario, prioridad)
    if (nueva.getTime() !== fechaLimiteArea.getTime()) {
      ticket.fechaLimiteArea = nueva
      cambio.fechaLimiteAreaAnterior = fechaLimiteArea
    }
  }
  return cambio
}
