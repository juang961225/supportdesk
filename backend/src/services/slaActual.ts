import mongoose from 'mongoose'
import TicketEvent from '../models/TicketEvent'
import { horarioDeMarca } from './horario'
import { HorarioLaboral } from '../utils/horarioLaboral'
import { calcularSlaActual, inicioDelPlazo, SlaActual } from '../utils/slaActual'

type Ref = mongoose.Types.ObjectId | { _id: mongoose.Types.ObjectId }

interface TicketConPlazo {
  _id: mongoose.Types.ObjectId
  marca: Ref
  estado: string
  createdAt: Date
  fechaLimite?: Date | null
}

const idDe = (ref: Ref): string => String(ref instanceof mongoose.Types.ObjectId ? ref : ref._id)

// SLA actual de varios tickets: una consulta de eventos y un horario por marca
export const slaDeTickets = async (tickets: TicketConPlazo[]): Promise<Map<string, SlaActual | null>> => {
  const resultado = new Map<string, SlaActual | null>()
  const abiertos = tickets.filter((t) => t.estado !== 'cerrado' && t.fechaLimite)
  for (const t of tickets) resultado.set(String(t._id), null)
  if (abiertos.length === 0) return resultado

  const marcas = [...new Set(abiertos.map((t) => idDe(t.marca)))]
  const [eventos, horarios] = await Promise.all([
    TicketEvent.find({
      ticket: { $in: abiertos.map((t) => t._id) },
      $or: [{ tipo: 'movido' }, { tipo: 'estado', a: 'reabierto' }]
    }).select('ticket tipo a createdAt').lean<{ ticket: mongoose.Types.ObjectId; tipo: string; a?: string; createdAt: Date }[]>(),
    Promise.all(marcas.map(async (m) => [m, await horarioDeMarca(m)] as const))
  ])
  const horarioPorMarca = new Map<string, HorarioLaboral>(horarios)

  const ahora = new Date()
  for (const t of abiertos) {
    const horario = horarioPorMarca.get(idDe(t.marca))
    if (!horario) continue
    const propios = eventos.filter((e) => String(e.ticket) === String(t._id))
    resultado.set(String(t._id), calcularSlaActual(
      { estado: t.estado, fechaLimite: t.fechaLimite, inicioPlazo: inicioDelPlazo(t.createdAt, propios) },
      horario,
      ahora
    ))
  }
  return resultado
}

// Agrega `sla` a cada ticket de una respuesta (documentos de Mongoose u objetos planos)
export const conSla = async <T extends TicketConPlazo>(tickets: T[]): Promise<(T & { sla: SlaActual | null })[]> => {
  const slas = await slaDeTickets(tickets)
  return tickets.map((t) => ({ ...t, sla: slas.get(String(t._id)) ?? null }))
}
