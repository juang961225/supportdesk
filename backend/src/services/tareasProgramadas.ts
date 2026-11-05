import mongoose from 'mongoose'
import Ticket from '../models/Ticket'
import { horarioDeMarca } from './horario'
import { notificar } from './notificaciones'
import { conSla } from './slaActual'
import { registrarEvento } from './ticketEvents'
import { avisarCambioTicket } from './tiempoReal'
import { ESTADOS_EN_PAUSA, ESTADOS_SIN_RELOJ } from '../utils/ticketStatus'
import { accionDePausa, AccionPausa, avisoDePlazo, tareasActivas, DIAS_CIERRE_RESUELTO, DIAS_CIERRE_SIN_RESPUESTA } from '../utils/tareas'

// Revisión periódica: avisos de plazo, recordatorios y cierres automáticos.
// Cada acción se reclama con una actualización condicional, así que aunque corran varias instancias del
// servidor, o el usuario actúe al mismo tiempo, solo una la ejecuta y nada se envía dos veces.
//
// Variables en .env:
//   TAREAS_PROGRAMADAS — "on" u "off". Sin definir: solo en producción
//   TAREAS_INTERVALO_MINUTOS — cada cuánto revisa (por defecto 5)

const INTERVALO_POR_DEFECTO = 5
const MINUTO_MS = 60 * 1000

const MOTIVO_CIERRE: Record<'cerrar_sin_respuesta' | 'cerrar_sin_confirmar', string> = {
  cerrar_sin_respuesta: `Sin respuesta del usuario en ${DIAS_CIERRE_SIN_RESPUESTA} días laborales`,
  cerrar_sin_confirmar: `Sin confirmación del usuario en ${DIAS_CIERRE_RESUELTO} días laborales`
}

interface TicketEnPausa {
  _id: mongoose.Types.ObjectId
  marca: mongoose.Types.ObjectId
  estado: 'esperando_usuario' | 'resuelto'
  pausadoDesde: Date
  avisosPlazo?: { recordatorio?: Date }
}

const atenderPausa = async (ticket: TicketEnPausa, accion: NonNullable<AccionPausa>): Promise<void> => {
  // Solo si sigue igual que al leerlo: si el usuario respondió o confirmó, ya no aplica
  const sigueIgual = { _id: ticket._id, estado: ticket.estado, pausadoDesde: ticket.pausadoDesde }

  if (accion === 'recordar') {
    const reclamado = await Ticket.updateOne(
      { ...sigueIgual, 'avisosPlazo.recordatorio': { $ne: ticket.pausadoDesde } },
      { $set: { 'avisosPlazo.recordatorio': ticket.pausadoDesde } },
      { timestamps: false }
    )
    if (reclamado.modifiedCount === 1) notificar(ticket._id, null, { tipo: 'recordatorio' })
    return
  }

  const cerrado = await Ticket.updateOne(sigueIgual, { $set: { estado: 'cerrado', fechaCierre: new Date() }, $unset: { pausadoDesde: 1 } })
  if (cerrado.modifiedCount !== 1) return
  await registrarEvento({
    ticket: ticket._id,
    marca: ticket.marca,
    tipo: 'estado',
    de: ticket.estado,
    a: 'cerrado',
    motivo: MOTIVO_CIERRE[accion]
  })
  notificar(ticket._id, null, { tipo: 'cierre_automatico', motivo: accion === 'cerrar_sin_respuesta' ? 'sin_respuesta' : 'sin_confirmar' })
  avisarCambioTicket(ticket._id)
}

const revisarPausas = async (): Promise<void> => {
  const tickets = await Ticket.find({ estado: { $in: ESTADOS_EN_PAUSA }, pausadoDesde: { $exists: true } })
    .select('marca estado pausadoDesde avisosPlazo')
    .lean<TicketEnPausa[]>()
  const ahora = new Date()
  for (const ticket of tickets) {
    const accion = accionDePausa(ticket, await horarioDeMarca(ticket.marca), ahora)
    if (accion) await atenderPausa(ticket, accion)
  }
}

const revisarPlazos = async (): Promise<void> => {
  const tickets = await Ticket.find({ estado: { $nin: ESTADOS_SIN_RELOJ }, fechaLimite: { $exists: true } })
    .select('marca estado prioridad createdAt fechaLimite fechaLimiteArea avisosPlazo')
    .lean()
  const ahora = new Date()
  for (const ticket of await conSla(tickets)) {
    const { marcas, enviar } = avisoDePlazo(ticket, ticket.sla, ticket.slaArea, ahora)
    const claves = Object.entries(marcas)
    if (claves.length === 0) continue
    // Reclama el aviso: si otra instancia ya lo marcó, o la fecha cambió, no se envía
    const reclamado = await Ticket.updateOne(
      {
        _id: ticket._id,
        fechaLimite: ticket.fechaLimite,
        ...Object.fromEntries(claves.map(([clave, limite]) => [`avisosPlazo.${clave}`, { $ne: limite }]))
      },
      { $set: Object.fromEntries(claves.map(([clave, limite]) => [`avisosPlazo.${clave}`, limite])) },
      { timestamps: false }
    )
    if (reclamado.modifiedCount === 1 && enviar) notificar(ticket._id, null, { tipo: 'plazo', ...enviar })
  }
}

export const revisarTareas = async (): Promise<void> => {
  await revisarPausas()
  await revisarPlazos()
}

// Arranca la revisión periódica. Una revisión no empieza si la anterior sigue corriendo
export const iniciarTareasProgramadas = (): void => {
  if (!tareasActivas(process.env)) {
    console.log('[tareas] Desactivadas: sin avisos de plazo ni cierres automáticos')
    return
  }

  const minutos = Number(process.env.TAREAS_INTERVALO_MINUTOS)
  const intervalo = (minutos > 0 ? minutos : INTERVALO_POR_DEFECTO) * MINUTO_MS
  let corriendo = false

  const revisar = async () => {
    if (corriendo || mongoose.connection.readyState !== 1) return
    corriendo = true
    try {
      await revisarTareas()
    } catch (error) {
      console.error('[tareas] Error en la revisión:', error)
    } finally {
      corriendo = false
    }
  }

  setInterval(revisar, intervalo).unref()
  console.log(`[tareas] Activas: revisan cada ${intervalo / MINUTO_MS} min`)
}
