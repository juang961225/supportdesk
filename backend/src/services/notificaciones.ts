import mongoose from 'mongoose'
import Ticket from '../models/Ticket'
import User from '../models/User'
import { enviarEmail, urlFrontend } from './email'
import { plantillaTicket, estadoLegible, prioridadLegible, DatosPlantilla } from '../utils/plantillasEmail'
import { actorParaDestinatario } from '../utils/privacidadTicket'
import { DIAS_CIERRE_RESUELTO, DIAS_CIERRE_SIN_RESPUESTA, DIAS_RECORDATORIO } from '../utils/tareas'

// Avisos por email de lo que pasa en un ticket. Quién recibe cada uno:
//   creado     → soportes del área + admins de la marca
//   movido     → soportes del área destino
//   asignado   → el soporte asignado (asignar, reasignar o pasar)
//   estado     → creador + observadores (+ el soporte asignado si el usuario confirma o reabre)
//   comentario → creador + observadores + soporte asignado (o los soportes del área si está en cola)
//   nota interna → soporte asignado y soportes del área; nunca el usuario final
//   prioridad  → creador + observadores + soporte asignado
//   plazo      → soporte asignado (o los soportes del área si está en cola); si vence el del ticket, también los admins
//   recordatorio → creador + observadores (siguen sin responder)
//   cierre automático → creador + observadores + soporte asignado
// Nunca a quien hizo la acción ni a usuarios inactivos. El usuario final ve el área, no quién del equipo actuó.

export type EventoNotificable =
  | { tipo: 'creado' }
  | { tipo: 'movido' }
  | { tipo: 'asignado' }
  | { tipo: 'estado'; de: string; a: string }
  | { tipo: 'comentario'; contenido: string; adjuntos: number; interna?: boolean }
  | { tipo: 'prioridad'; de: string; a: string }
  | { tipo: 'plazo'; alcance: 'ticket' | 'area'; nivel: 'pronto' | 'vencido' }
  | { tipo: 'recordatorio' }
  | { tipo: 'cierre_automatico'; motivo: 'sin_respuesta' | 'sin_confirmar' }

type Id = mongoose.Types.ObjectId | string

interface TicketNotificable {
  _id: mongoose.Types.ObjectId
  titulo: string
  descripcion: string
  prioridad: string
  marca: mongoose.Types.ObjectId
  area?: { _id: mongoose.Types.ObjectId; nombre: string } | null
  submarca?: { nombre: string } | null
  submarcasRelacionadas?: { nombre: string }[]
  contexto?: { nombre?: string } | null
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
      return (evento.a === 'reabierto' || evento.a === 'cerrado') && ticket.asignadoA ? [...participantes, ticket.asignadoA] : participantes
    case 'prioridad':
    case 'cierre_automatico':
      return ticket.asignadoA ? [...participantes, ticket.asignadoA] : participantes
    case 'recordatorio':
      return participantes
    case 'plazo': {
      const equipo = ticket.asignadoA ? [ticket.asignadoA] : await soportesDelArea(ticket)
      return evento.alcance === 'ticket' && evento.nivel === 'vencido' ? [...equipo, ...(await adminsDeLaMarca(ticket))] : equipo
    }
    case 'comentario':
      if (evento.interna) return [...(ticket.asignadoA ? [ticket.asignadoA] : []), ...(await soportesDelArea(ticket))]
      return [...participantes, ...(ticket.asignadoA ? [ticket.asignadoA] : await soportesDelArea(ticket))]
  }
}

// "Sub-marca: MINI (también BMW, BMWi) · ": la principal primero, las relacionadas entre paréntesis
const textoSubmarcas = (ticket: TicketNotificable): string => {
  if (!ticket.submarca) return ''
  const relacionadas = (ticket.submarcasRelacionadas ?? []).map((s) => s.nombre)
  return `Sub-marca: ${ticket.submarca.nombre}${relacionadas.length > 0 ? ` (también ${relacionadas.join(', ')})` : ''} · `
}

const contenido = (ticket: TicketNotificable, evento: EventoNotificable, actor: string): Omit<DatosPlantilla, 'enlace'> & { asunto: string } => {
  const area = ticket.area?.nombre ?? 'Sin área'
  const base = { ticketTitulo: ticket.titulo, detalle: `${textoSubmarcas(ticket)}${ticket.contexto?.nombre ? `${ticket.contexto.nombre} · ` : ''}Área: ${area} · Prioridad: ${prioridadLegible[ticket.prioridad] ?? ticket.prioridad}` }
  switch (evento.tipo) {
    case 'creado':
      return { ...base, asunto: `Nuevo ticket: ${ticket.titulo}`, resumen: `${actor} creó un ticket en ${area}.`, extracto: ticket.descripcion }
    case 'movido':
      return { ...base, asunto: `Ticket movido a ${area}: ${ticket.titulo}`, resumen: `${actor} movió el ticket a ${area}. Está sin asignar en la cola del área.` }
    case 'asignado':
      return { ...base, asunto: `Te asignaron un ticket: ${ticket.titulo}`, resumen: `${actor} te asignó este ticket.`, extracto: ticket.descripcion }
    case 'estado': {
      const a = estadoLegible[evento.a] ?? evento.a
      if (evento.a === 'esperando_usuario') {
        return { ...base, asunto: `Necesitamos tu respuesta: ${ticket.titulo}`, resumen: `${actor} necesita información para continuar. Responde en el ticket y seguirá su atención. Si no respondes en ${DIAS_CIERRE_SIN_RESPUESTA} días laborales, se cerrará automáticamente.` }
      }
      if (evento.a === 'resuelto') {
        return { ...base, asunto: `Ticket resuelto: ${ticket.titulo}`, resumen: `${actor} marcó el ticket como resuelto. Entra para confirmarlo, o reábrelo si el problema sigue. Si no respondes en ${DIAS_CIERRE_RESUELTO} días laborales, se cerrará automáticamente.` }
      }
      const resumen = evento.a === 'reabierto'
        ? `${actor} reabrió el ticket.`
        : `${actor} cambió el estado: ${estadoLegible[evento.de] ?? evento.de} → ${a}.`
      return { ...base, asunto: `Ticket ${a.toLowerCase()}: ${ticket.titulo}`, resumen }
    }
    case 'comentario': {
      const adjuntos = evento.adjuntos > 0 ? ` (con ${evento.adjuntos} archivo${evento.adjuntos > 1 ? 's' : ''} adjunto${evento.adjuntos > 1 ? 's' : ''})` : ''
      if (evento.interna) {
        return { ...base, asunto: `Nota interna en: ${ticket.titulo}`, resumen: `${actor} agregó una nota interna${adjuntos}:`, extracto: evento.contenido }
      }
      return { ...base, asunto: `Nuevo comentario en: ${ticket.titulo}`, resumen: `${actor} comentó${adjuntos}:`, extracto: evento.contenido }
    }
    case 'prioridad':
      return {
        ...base,
        asunto: `Prioridad cambiada: ${ticket.titulo}`,
        resumen: `${actor} cambió la prioridad: ${prioridadLegible[evento.de] ?? evento.de} → ${prioridadLegible[evento.a] ?? evento.a}.`
      }
    case 'plazo': {
      const cual = evento.alcance === 'ticket' ? 'la fecha prometida al cliente' : `el plazo del área ${area}`
      return evento.nivel === 'vencido'
        ? { ...base, asunto: `${evento.alcance === 'ticket' ? 'Ticket vencido' : 'Plazo del área vencido'}: ${ticket.titulo}`, resumen: `Se venció ${cual}.` }
        : { ...base, asunto: `Por vencer: ${ticket.titulo}`, resumen: `Este ticket ya consumió el 75 % de ${cual}.` }
    }
    case 'recordatorio':
      return { ...base, asunto: `Seguimos esperando tu respuesta: ${ticket.titulo}`, resumen: `Para continuar necesitamos tu respuesta. Si no llega en ${DIAS_CIERRE_SIN_RESPUESTA - DIAS_RECORDATORIO} días laborales, el ticket se cerrará automáticamente.` }
    case 'cierre_automatico':
      return {
        ...base,
        asunto: `Ticket cerrado: ${ticket.titulo}`,
        resumen: evento.motivo === 'sin_respuesta'
          ? `Se cerró automáticamente porque no recibimos respuesta en ${DIAS_CIERRE_SIN_RESPUESTA} días laborales. Si aún lo necesitas, crea un ticket nuevo.`
          : `Se cerró automáticamente porque no hubo confirmación en ${DIAS_CIERRE_RESUELTO} días laborales. Si el problema volvió, crea un ticket nuevo.`
      }
  }
}

// actorId null: lo hizo el sistema, no hay a quién excluir
const procesar = async (ticketId: Id, actorId: Id | null, evento: EventoNotificable): Promise<void> => {
  const [ticket, actor] = await Promise.all([
    Ticket.findById(ticketId)
      .select('titulo descripcion prioridad marca area submarca submarcasRelacionadas contexto creadoPor asignadoA observadores')
      .populate('area', 'nombre')
      .populate('submarca', 'nombre')
      .populate('submarcasRelacionadas', 'nombre')
      .lean<TicketNotificable>(),
    actorId ? User.findById(actorId).select('nombre rol').lean() : null
  ])
  if (!ticket) return

  const ids = [...new Set((await idsDestinatarios(ticket, evento)).map(String))].filter((id) => id !== String(actorId))
  if (ids.length === 0) return

  const todos = await User.find({ _id: { $in: ids }, estado: 'activo' }).select('nombre email rol').lean<Destinatario[]>()
  // Segunda barrera: las notas internas y los avisos de plazo nunca salen hacia un usuario final
  const soloEquipo = (evento.tipo === 'comentario' && evento.interna) || evento.tipo === 'plazo'
  const destinatarios = soloEquipo ? todos.filter((d) => d.rol !== 'usuario') : todos

  await Promise.all(destinatarios.map((d) => {
    const { asunto, ...datos } = contenido(ticket, evento, actorParaDestinatario(actor, d.rol, ticket.area?.nombre))
    const { html, texto } = plantillaTicket({ ...datos, enlace: `${urlFrontend()}/${RUTA_POR_ROL[d.rol]}/tickets/${ticket._id}` })
    return enviarEmail({ para: { nombre: d.nombre, email: d.email }, asunto: `[SupportDesk] ${asunto}`, html, texto })
  }))
}

// Se llama después de guardar la acción, sin await: los emails no demoran ni rompen la respuesta
export const notificar = (ticketId: Id, actorId: Id | null, evento: EventoNotificable): void => {
  procesar(ticketId, actorId, evento).catch((error) => {
    console.error(`[email] Error al preparar el aviso "${evento.tipo}" del ticket ${String(ticketId)}:`, error)
  })
}
