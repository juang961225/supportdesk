import mongoose from 'mongoose'
import { ITicket } from '../models/Ticket'
import { esEstadoValido } from './ticketStatus'

const PRIORIDADES: ITicket['prioridad'][] = ['baja', 'media', 'alta', 'critica']
const MAX_BUSQUEDA = 100
const HORAS_24_MS = 24 * 60 * 60 * 1000 // "vence pronto", igual que el badge del frontend

const texto = (valor: unknown): string | null =>
  typeof valor === 'string' && valor.trim() ? valor.trim() : null

const escaparRegex = (valor: string): string => valor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const objectId = (valor: unknown): mongoose.Types.ObjectId | null => {
  const t = texto(valor)
  return t && mongoose.isValidObjectId(t) ? new mongoose.Types.ObjectId(t) : null
}

const fecha = (valor: unknown): Date | null => {
  const t = texto(valor)
  if (!t) return null
  const d = new Date(t)
  return Number.isNaN(d.getTime()) ? null : d
}

const esPrioridad = (valor: unknown): valor is ITicket['prioridad'] =>
  typeof valor === 'string' && (PRIORIDADES as string[]).includes(valor)

// Condiciones de los filtros de la lista (?q, ?estado, ?prioridad, ?area, ?asignado, ?marca, ?desde, ?hasta, ?vencimiento).
// Se combinan con $and sobre el filtro del rol, así que ningún filtro amplía lo que el usuario puede ver.
// Los valores inválidos se ignoran.
export const leerFiltrosTicket = (query: Record<string, unknown>): Record<string, unknown>[] => {
  const condiciones: Record<string, unknown>[] = []

  const q = texto(query.q)
  if (q) {
    const re = new RegExp(escaparRegex(q.slice(0, MAX_BUSQUEDA)), 'i')
    condiciones.push({ $or: [{ titulo: re }, { descripcion: re }] })
  }

  const estado = texto(query.estado)
  if (estado === 'activos') condiciones.push({ estado: { $ne: 'cerrado' } })
  else if (esEstadoValido(estado)) condiciones.push({ estado })

  if (esPrioridad(query.prioridad)) condiciones.push({ prioridad: query.prioridad })

  const area = objectId(query.area)
  if (area) condiciones.push({ area })

  if (query.asignado === 'sin_asignar') {
    condiciones.push({ asignadoA: null })
  } else {
    const asignado = objectId(query.asignado)
    if (asignado) condiciones.push({ asignadoA: asignado })
  }

  const marca = objectId(query.marca)
  if (marca) condiciones.push({ marca })

  // El frontend manda el inicio del día local en `desde` y el inicio del día siguiente en `hasta`
  const desde = fecha(query.desde)
  if (desde) condiciones.push({ createdAt: { $gte: desde } })
  const hasta = fecha(query.hasta)
  if (hasta) condiciones.push({ createdAt: { $lt: hasta } })

  const ahora = new Date()
  if (query.vencimiento === 'vencidos') {
    condiciones.push({ estado: { $ne: 'cerrado' }, fechaLimite: { $lt: ahora } })
  } else if (query.vencimiento === 'pronto') {
    condiciones.push({
      estado: { $ne: 'cerrado' },
      fechaLimite: { $gte: ahora, $lte: new Date(ahora.getTime() + HORAS_24_MS) }
    })
  }

  return condiciones
}
