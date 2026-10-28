import mongoose from 'mongoose'
import Ticket from '../models/Ticket'
import User from '../models/User'
import { enviarEmail, urlFrontend } from './email'
import { plantillaTicket, estadoLegible, prioridadLegible, DatosPlantilla } from '../utils/plantillasEmail'

// Avisos por email de lo que pasa en un ticket. Quién recibe cada uno:
//   creado     → soportes del área + admins de la marca
//   movido     → soportes del área destino
//   asignado   → el soporte asignado (asignar, reasignar o pasar)
//   estado     → creador + observadores (+ el soporte asignado si se reabre)
//   comentario → creador + observadores + soporte asignado (o los soportes del área si está en cola)
// Nunca a quien hizo la acción ni a usuarios inactivos.

export type EventoNotificable =
  | { tipo: 'creado' }
  | { tipo: 'movido' }
  | { tipo: 'asignado' }
  | { tipo: 'estado'; de: string; a: string }
  | { tipo: 'comentario'; contenido: string; adjuntos: number }

type Id = mongoose.Types.ObjectId | string

interface TicketNotificable {
  _id: mongoose.Types.ObjectId
  titulo: string
  descripcion: string
  prioridad: string
  marca: mongoose.Types.ObjectId
  area?: { _id: mongoose.Types.ObjectId; nombre: string } | null
  creadoPor: mongoose.Types.ObjectId
  asignadoA?: mongoose.Types.ObjectId | null
  observadores?: mongoose.Types.ObjectId[]
}

interface Destinatario {
  _id: mongoose.Types.ObjectId
  nombre: string
  email: string
  rol: 'superadmin' | 'admin' | 'soporte' | 'usuario'
}

// Cada rol abre el ticket en su propia ruta del frontend
const RUTA_POR_ROL: Record<Destinatario['rol'], string> = {
  superadmin: 'admin',
  admin: 'admin',
  soporte: 'soporte',
  usuario: 'usuario'
}

const soportesDelArea = async (ticket: TicketNotificable): Promise<Id[]> => {
  if (!ticket.area) return []
  const soportes = await User.find({ marca: ticket.marca, rol: 'soporte', estado: 'activo', areas: ticket.area._id }).select('_id').lean()
  return soportes.map((s) => s._id)
}

const adminsDeLaMarca = async (ticket: TicketNotificable): Promise<Id[]> => {
  const admins = await User.find({ marca: ticket.marca, rol: 'admin', estado: 'activo' }).select('_id').lean()
  return admins.map((a) => a._id)
}

const idsDestinatarios = async (ticket: TicketNotificable, evento: EventoNotificable): Promise<Id[]> => {
  // Tickets anteriores a los observadores no tienen el campo en la base (lean no aplica el default)
  const participantes = [ticket.creadoPor, ...(ticket.observadores ?? [])]
  switch (evento.tipo) {
    case 'creado':
      return [...(await soportesDelArea(ticket)), ...(await adminsDeLaMarca(ticket))]
    case 'movido':
      return soportesDelArea(ticket)
    case 'asignado':
      return ticket.asignadoA ? [ticket.asignadoA] : []
    case 'estado':
      return evento.a === 'reabierto' && ticket.asignadoA ? [...participantes, ticket.asignadoA] : participantes
    case 'comentario':
      return [...participantes, ...(ticket.asignadoA ? [ticket.asignadoA] : await soportesDelArea(ticket))]
  }
}

const contenido = (ticket: TicketNotificable, evento: EventoNotificable, actor: string): Omit<DatosPlantilla, 'enlace'> & { asunto: string } => {
  const area = ticket.area?.nombre ?? 'Sin área'
  const base = { ticketTitulo: ticket.titulo, detalle: `Área: ${area} · Prioridad: ${prioridadLegible[ticket.prioridad] ?? ticket.prioridad}` }
  switch (evento.tipo) {
    case 'creado':
      return { ...base, asunto: `Nuevo ticket: ${ticket.titulo}`, resumen: `${actor} creó un ticket en ${area}.`, extracto: ticket.descripcion }
    case 'movido':
      return { ...base, asunto: `Ticket movido a ${area}: ${ticket.titulo}`, resumen: `${actor} movió el ticket a ${area}. Está sin asignar en la cola del área.` }
    case 'asignado':
      return { ...base, asunto: `Te asignaron un ticket: ${ticket.titulo}`, resumen: `${actor} te asignó este ticket.`, extracto: ticket.descripcion }
    case 'estado': {
      const a = estadoLegible[evento.a] ?? evento.a
      const resumen = evento.a === 'reabierto'
        ? `${actor} reabrió el ticket.`
        : `${actor} cambió el estado: ${estadoLegible[evento.de] ?? evento.de} → ${a}.`
      return { ...base, asunto: `Ticket ${a.toLowerCase()}: ${ticket.titulo}`, resumen }
    }
    case 'comentario': {
      const adjuntos = evento.adjuntos > 0 ? ` (con ${evento.adjuntos} archivo${evento.adjuntos > 1 ? 's' : ''} adjunto${evento.adjuntos > 1 ? 's' : ''})` : ''
      return { ...base, asunto: `Nuevo comentario en: ${ticket.titulo}`, resumen: `${actor} comentó${adjuntos}:`, extracto: evento.contenido }
    }
  }
}

const procesar = async (ticketId: Id, actorId: Id, evento: EventoNotificable): Promise<void> => {
  const [ticket, actor] = await Promise.all([
    Ticket.findById(ticketId)
      .select('titulo descripcion prioridad marca area creadoPor asignadoA observadores')
      .populate('area', 'nombre')
      .lean<TicketNotificable>(),
    User.findById(actorId).select('nombre').lean()
  ])
  if (!ticket) return

  const ids = [...new Set((await idsDestinatarios(ticket, evento)).map(String))].filter((id) => id !== String(actorId))
  if (ids.length === 0) return

  const destinatarios = await User.find({ _id: { $in: ids }, estado: 'activo' }).select('nombre email rol').lean<Destinatario[]>()
  const { asunto, ...datos } = contenido(ticket, evento, actor?.nombre ?? 'Alguien')

  await Promise.all(destinatarios.map((d) => {
    const { html, texto } = plantillaTicket({ ...datos, enlace: `${urlFrontend()}/${RUTA_POR_ROL[d.rol]}/tickets/${ticket._id}` })
    return enviarEmail({ para: { nombre: d.nombre, email: d.email }, asunto: `[SupportDesk] ${asunto}`, html, texto })
  }))
}

// Se llama después de guardar la acción, sin await: los emails no demoran ni rompen la respuesta
export const notificar = (ticketId: Id, actorId: Id, evento: EventoNotificable): void => {
  procesar(ticketId, actorId, evento).catch((error) => {
    console.error(`[email] Error al preparar el aviso "${evento.tipo}" del ticket ${String(ticketId)}:`, error)
  })
}
