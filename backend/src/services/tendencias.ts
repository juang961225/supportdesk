import mongoose from 'mongoose'
import Ticket from '../models/Ticket'
import TicketCategory from '../models/TicketCategory'
import Area from '../models/Area'
import { slaPorArea, SlaArea } from './tramos'

export const PERIODOS_VALIDOS = [7, 30, 90] as const
export type Periodo = typeof PERIODOS_VALIDOS[number]

const ZONA = 'America/Bogota'
const OFFSET_MS = -5 * 60 * 60 * 1000 // Colombia: UTC-5 fijo
const DIA_MS = 24 * 60 * 60 * 1000
const ORDEN_ESTADOS = ['abierto', 'reabierto', 'en_progreso', 'en_revision', 'cerrado']

interface Conteo {
  _id: unknown
  total: number
}

export interface Tendencias {
  dias: Periodo
  unidad: 'dia' | 'semana'
  total: number
  creados: { fecha: string; total: number }[] // fecha = inicio del día/semana (AAAA-MM-DD, hora Colombia)
  porEstado: { estado: string; total: number }[]
  porCategoria: { id: string | null; nombre: string; total: number }[]
  porArea: { id: string | null; nombre: string; total: number }[]
  sla: SlaArea[]
}

// "AAAA-MM-DD" del instante en hora Colombia
const fechaLocal = (ms: number): string => new Date(ms + OFFSET_MS).toISOString().slice(0, 10)

// Inicio de cada día (o semana, desde el lunes) del periodo, para rellenar con ceros los vacíos
const cubetas = (desdeMs: number, hastaMs: number, unidad: 'dia' | 'semana'): string[] => {
  const claves: string[] = []
  let t = desdeMs
  if (unidad === 'semana') {
    const diaSemana = new Date(t + OFFSET_MS).getUTCDay() // 0 = domingo
    t -= ((diaSemana + 6) % 7) * DIA_MS
  }
  const paso = unidad === 'semana' ? 7 * DIA_MS : DIA_MS
  for (; t <= hastaMs; t += paso) claves.push(fechaLocal(t))
  return claves
}

const conNombres = (conteos: Conteo[], nombres: Map<string, string>, sinNombre: string) =>
  conteos
    .map((c) => {
      const id = c._id ? String(c._id) : null
      return { id, nombre: (id && nombres.get(id)) || sinNombre, total: c.total }
    })
    .sort((a, b) => b.total - a.total || a.nombre.localeCompare(b.nombre, 'es'))

// Tickets creados en los últimos `dias` días (desde las 00:00 hora Colombia), por día/semana, estado, categoría y área
export const tendenciasDeMarca = async (marcaId: string, dias: Periodo): Promise<Tendencias> => {
  const ahora = Date.now()
  const hoyLocal = ahora + OFFSET_MS
  const desdeMs = hoyLocal - (hoyLocal % DIA_MS) - OFFSET_MS - (dias - 1) * DIA_MS
  const unidad = dias === 90 ? 'semana' : 'dia'

  const match = { marca: new mongoose.Types.ObjectId(marcaId), createdAt: { $gte: new Date(desdeMs) } }
  const agrupar = (campo: string) => Ticket.aggregate<Conteo>([
    { $match: match },
    { $group: { _id: campo, total: { $sum: 1 } } }
  ])

  const [porFecha, porEstado, porCategoria, porArea, categorias, areas, sla] = await Promise.all([
    Ticket.aggregate<Conteo>([
      { $match: match },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              timezone: ZONA,
              date: { $dateTrunc: { date: '$createdAt', unit: unidad === 'semana' ? 'week' : 'day', timezone: ZONA, startOfWeek: 'monday' } }
            }
          },
          total: { $sum: 1 }
        }
      }
    ]),
    agrupar('$estado'),
    agrupar('$categoria'),
    agrupar('$area'),
    TicketCategory.find({ marca: marcaId }).select('nombre').lean(),
    Area.find({ marca: marcaId }).select('nombre').lean(),
    slaPorArea(marcaId, dias)
  ])

  const totalPorFecha = new Map(porFecha.map((c) => [String(c._id), c.total]))
  const totalPorEstado = new Map(porEstado.map((c) => [String(c._id), c.total]))

  return {
    dias,
    unidad,
    total: porEstado.reduce((suma, c) => suma + c.total, 0),
    creados: cubetas(desdeMs, ahora, unidad).map((fecha) => ({ fecha, total: totalPorFecha.get(fecha) ?? 0 })),
    porEstado: ORDEN_ESTADOS.map((estado) => ({ estado, total: totalPorEstado.get(estado) ?? 0 })),
    porCategoria: conNombres(porCategoria, new Map(categorias.map((c) => [String(c._id), c.nombre])), 'Sin categoría'),
    porArea: conNombres(porArea, new Map(areas.map((a) => [String(a._id), a.nombre])), 'Sin área'),
    sla
  }
}
