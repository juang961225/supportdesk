import mongoose from 'mongoose'
import Ticket from '../models/Ticket'
import TicketEvent, { TipoEvento } from '../models/TicketEvent'
import Area from '../models/Area'
import { horarioDeMarca } from './horario'
import { calcularTramos, EventoParaTramos, TicketParaTramos, Tramo } from '../utils/tramos'

const TIPOS_RELEVANTES: TipoEvento[] = ['movido', 'estado', 'fecha_limite']
const CAMPOS_EVENTO = 'ticket tipo createdAt de a deNombre aNombre fechaLimiteAnterior'

// Forma de los eventos que trae CAMPOS_EVENTO con .lean()
interface EventoLean extends EventoParaTramos {
  ticket: mongoose.Types.ObjectId
}

interface TicketLean {
  _id: mongoose.Types.ObjectId
  createdAt: Date
  estado: string
  fechaCierre?: Date
  fechaLimite?: Date
  area?: { _id: mongoose.Types.ObjectId; nombre: string } | null
}

const aTicketParaTramos = (t: TicketLean): TicketParaTramos => ({
  createdAt: t.createdAt,
  estado: t.estado,
  fechaCierre: t.fechaCierre,
  fechaLimite: t.fechaLimite,
  areaId: t.area ? String(t.area._id) : undefined,
  areaNombre: t.area?.nombre
})

const aEvento = (e: { tipo: string; createdAt: Date; de?: string; a?: string; deNombre?: string; aNombre?: string; fechaLimiteAnterior?: Date }): EventoParaTramos => ({
  tipo: e.tipo, createdAt: e.createdAt, de: e.de, a: e.a, deNombre: e.deNombre, aNombre: e.aNombre, fechaLimiteAnterior: e.fechaLimiteAnterior
})

// Tramos de un ticket (ya validado el acceso), con el horario de su marca
export const tramosDeTicket = async (ticketId: mongoose.Types.ObjectId): Promise<Tramo[]> => {
  const ticket = await Ticket.findById(ticketId)
    .select('createdAt estado fechaCierre fechaLimite area marca')
    .populate('area', 'nombre')
    .lean<TicketLean & { marca: mongoose.Types.ObjectId }>()
  if (!ticket) return []

  const [eventos, horario] = await Promise.all([
    TicketEvent.find({ ticket: ticketId, tipo: { $in: TIPOS_RELEVANTES } }).select(CAMPOS_EVENTO).sort({ createdAt: 1 }).lean<EventoLean[]>(),
    horarioDeMarca(ticket.marca)
  ])
  return calcularTramos(aTicketParaTramos(ticket), eventos.map(aEvento), horario)
}

// Eventos relevantes de varios tickets en una sola consulta, agrupados por ticket
const eventosEnLote = async (ticketIds: mongoose.Types.ObjectId[]): Promise<Map<string, EventoParaTramos[]>> => {
  const eventos = await TicketEvent.find({ ticket: { $in: ticketIds }, tipo: { $in: TIPOS_RELEVANTES } })
    .select(CAMPOS_EVENTO).sort({ createdAt: 1 }).lean<EventoLean[]>()
  const porTicket = new Map<string, EventoParaTramos[]>()
  for (const e of eventos) {
    const clave = String(e.ticket)
    porTicket.set(clave, [...(porTicket.get(clave) ?? []), aEvento(e)])
  }
  return porTicket
}

// Tramos de muchos tickets (pueden ser de varias marcas: cada uno con el horario de la suya)
export const tramosEnLote = async (
  tickets: (TicketLean & { marca: mongoose.Types.ObjectId | { _id: mongoose.Types.ObjectId } })[]
): Promise<Map<string, Tramo[]>> => {
  const idMarca = (t: (typeof tickets)[number]) => String('_id' in t.marca ? t.marca._id : t.marca)
  const marcas = [...new Set(tickets.map(idMarca))]
  const [eventosPorTicket, horarios] = await Promise.all([
    eventosEnLote(tickets.map((t) => t._id)),
    Promise.all(marcas.map(async (m) => [m, await horarioDeMarca(m)] as const))
  ])
  const horarioPorMarca = new Map(horarios)

  const resultado = new Map<string, Tramo[]>()
  for (const ticket of tickets) {
    const horario = horarioPorMarca.get(idMarca(ticket))
    if (!horario) continue
    resultado.set(String(ticket._id), calcularTramos(aTicketParaTramos(ticket), eventosPorTicket.get(String(ticket._id)) ?? [], horario))
  }
  return resultado
}

export interface SlaArea {
  areaId: string | null
  area: string
  tramos: number
  promedioMinutos: number
  vencidos: number
  porcentajeVencidos: number // sobre los tramos con fecha límite
}

// SLA por área de una marca: tramos terminados (movidos o cerrados) en los últimos `dias` días
export const slaPorArea = async (marcaId: string, dias: number): Promise<SlaArea[]> => {
  const desde = new Date(Date.now() - dias * 24 * 60 * 60 * 1000)

  // Un tramo que terminó en la ventana deja el ticket actualizado en la ventana
  const tickets = await Ticket.find({ marca: marcaId, updatedAt: { $gte: desde } })
    .select('createdAt estado fechaCierre fechaLimite area')
    .populate('area', 'nombre')
    .lean<TicketLean[]>()

  const [eventosPorTicket, horario, areas] = await Promise.all([
    eventosEnLote(tickets.map((t) => t._id)),
    horarioDeMarca(marcaId),
    Area.find({ marca: marcaId }).select('nombre').lean()
  ])
  const nombreArea = new Map(areas.map((a) => [String(a._id), a.nombre]))

  const porArea = new Map<string, { areaId: string | null; area: string; tramos: number; minutos: number; conLimite: number; vencidos: number }>()
  for (const ticket of tickets) {
    const tramos = calcularTramos(aTicketParaTramos(ticket), eventosPorTicket.get(String(ticket._id)) ?? [], horario)
    for (const tramo of tramos) {
      if (!tramo.salida || tramo.salida < desde) continue
      const clave = tramo.areaId ?? tramo.area
      const fila = porArea.get(clave) ?? {
        areaId: tramo.areaId,
        area: (tramo.areaId && nombreArea.get(tramo.areaId)) || tramo.area,
        tramos: 0, minutos: 0, conLimite: 0, vencidos: 0
      }
      fila.tramos += 1
      fila.minutos += tramo.minutosLaborales
      if (tramo.vencido !== null) fila.conLimite += 1
      if (tramo.vencido) fila.vencidos += 1
      porArea.set(clave, fila)
    }
  }

  return [...porArea.values()]
    .map((f) => ({
      areaId: f.areaId,
      area: f.area,
      tramos: f.tramos,
      promedioMinutos: Math.round(f.minutos / f.tramos),
      vencidos: f.vencidos,
      porcentajeVencidos: f.conLimite ? Math.round((f.vencidos / f.conLimite) * 100) : 0
    }))
    .sort((a, b) => a.area.localeCompare(b.area, 'es'))
}
