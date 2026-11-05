import mongoose from 'mongoose'
import TicketEvent from '../models/TicketEvent'
import { horarioDeMarca } from './horario'
import { HorarioLaboral } from '../utils/horarioLaboral'
import { calcularSlaActual, inicioDelPlazo, inicioDelPlazoArea, SlaActual } from '../utils/slaActual'
import { periodosPausa } from '../utils/tramos'
import { ESTADOS_SIN_RELOJ, EstadoTicket } from '../utils/ticketStatus'

type Ref = mongoose.Types.ObjectId | { _id: mongoose.Types.ObjectId }

interface TicketConPlazo {
  _id: mongoose.Types.ObjectId
  marca: Ref
  estado: string
  createdAt: Date
  fechaLimite?: Date | null
  fechaLimiteArea?: Date | null
  prioridad?: string
}

const idDe = (ref: Ref): string => String(ref instanceof mongoose.Types.ObjectId ? ref : ref._id)

export interface SlaDeTicket {
  sla: SlaActual | null // plazo del ticket: lo que se le prometió al cliente
  slaArea: SlaActual | null // plazo del tramo en el área actual
}

// SLA actual de varios tickets: una consulta de eventos y un horario por marca
export const slaDeTickets = async (tickets: TicketConPlazo[]): Promise<Map<string, SlaDeTicket>> => {
  const resultado = new Map<string, SlaDeTicket>()
  const abiertos = tickets.filter((t) => !ESTADOS_SIN_RELOJ.includes(t.estado as EstadoTicket) && t.fechaLimite)
  for (const t of tickets) resultado.set(String(t._id), { sla: null, slaArea: null })
  if (abiertos.length === 0) return resultado

  const marcas = [...new Set(abiertos.map((t) => idDe(t.marca)))]
  const [eventos, horarios] = await Promise.all([
    TicketEvent.find({
      ticket: { $in: abiertos.map((t) => t._id) },
      tipo: { $in: ['movido', 'prioridad', 'estado', 'soltado', 'desasignado'] }
    }).select('ticket tipo a createdAt fechaLimiteAreaAnterior').sort({ createdAt: 1 }).lean<{ ticket: mongoose.Types.ObjectId; tipo: string; a?: string; createdAt: Date; fechaLimiteAreaAnterior?: Date }[]>(),
    Promise.all(marcas.map(async (m) => [m, await horarioDeMarca(m)] as const))
  ])
  const horarioPorMarca = new Map<string, HorarioLaboral>(horarios)

  const ahora = new Date()
  for (const t of abiertos) {
    const horario = horarioPorMarca.get(idDe(t.marca))
    if (!horario) continue
    const propios = eventos.filter((e) => String(e.ticket) === String(t._id))
    const pausas = periodosPausa(t, propios)
    const base = { estado: t.estado, prioridad: t.prioridad }
    resultado.set(String(t._id), {
      sla: calcularSlaActual({ ...base, fechaLimite: t.fechaLimite, inicioPlazo: inicioDelPlazo(t.createdAt, propios) }, horario, ahora, pausas),
      slaArea: calcularSlaActual({ ...base, fechaLimite: t.fechaLimiteArea ?? t.fechaLimite, inicioPlazo: inicioDelPlazoArea(t.createdAt, propios) }, horario, ahora, pausas)
    })
  }
  return resultado
}

// Agrega `sla` y `slaArea` a cada ticket de una respuesta (documentos de Mongoose u objetos planos)
export const conSla = async <T extends TicketConPlazo>(tickets: T[]): Promise<(T & SlaDeTicket)[]> => {
  const slas = await slaDeTickets(tickets)
  return tickets.map((t) => ({ ...t, ...(slas.get(String(t._id)) ?? { sla: null, slaArea: null }) }))
}
