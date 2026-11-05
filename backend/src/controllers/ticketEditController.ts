import { Response, NextFunction } from 'express'
import Ticket from '../models/Ticket'
import TicketCategory from '../models/TicketCategory'
import { AuthRequest } from '../middlewares/auth'
import { registrarEvento } from '../services/ticketEvents'
import { findTicketResponse } from '../services/ticketQueries'
import { avisarCambioTicket } from '../services/tiempoReal'
import { fechaLimiteDeTicket } from '../services/horario'
import { notificar } from '../services/notificaciones'
import { puedeVerTicket } from '../utils/ticketAccess'
import { ticketParaRol } from '../utils/privacidadTicket'
import { describirEdicion } from '../utils/edicionTicket'

const MENSAJE_YA_ATENDIDO = 'Ya lo están atendiendo o está cerrado: agrega lo nuevo como comentario'

// PUT /api/tickets/:id — el creador corrige título y descripción mientras nadie lo atiende.
// La condición va en la misma actualización: si un soporte lo toma justo antes, no se edita.
export const editTicket = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { titulo, descripcion } = req.body
    const ticket = await Ticket.findById(req.params.id).select('titulo descripcion creadoPor marca')
    if (!ticket) {
      res.status(404).json({ message: 'Ticket no encontrado' })
      return
    }
    if (String(ticket.creadoPor) !== req.user?.id) {
      res.status(403).json({ message: 'Solo quien creó el ticket puede editarlo' })
      return
    }

    const edicion = describirEdicion(ticket, { titulo, descripcion })
    if (edicion) {
      const actualizado = await Ticket.findOneAndUpdate(
        { _id: ticket._id, creadoPor: req.user.id, asignadoA: null, estado: { $ne: 'cerrado' } },
        { titulo, descripcion }
      )
      if (!actualizado) {
        res.status(409).json({ message: MENSAJE_YA_ATENDIDO })
        return
      }
      await registrarEvento({ ticket: ticket._id, marca: ticket.marca, tipo: 'editado', autor: req.user.id, ...edicion })
      avisarCambioTicket(ticket._id)
    }

    const respuesta = await findTicketResponse(ticket._id)
    res.status(200).json({ message: 'Ticket actualizado', ticket: respuesta && ticketParaRol(respuesta, req.user.rol) })
  } catch (error) {
    next(error)
  }
}

// PUT /api/tickets/:id/categoria — admin y soporte corrigen la categoría.
// Solo cambia la clasificación: el área, quien lo atiende y la fecha límite siguen igual (para cambiar de área está "Mover")
export const updateTicketCategoria = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { categoriaId } = req.body
    const marca = req.user?.marca

    const ticket = await Ticket.findOne({ _id: req.params.id, marca })
    if (!ticket) {
      res.status(404).json({ message: 'Ticket no encontrado' })
      return
    }
    if (!puedeVerTicket(req.user!, ticket)) {
      res.status(403).json({ message: 'No tienes acceso a este ticket' })
      return
    }
    if (String(ticket.categoria) === String(categoriaId)) {
      res.status(400).json({ message: 'El ticket ya tiene esa categoría' })
      return
    }

    const [nueva, anterior] = await Promise.all([
      TicketCategory.findOne({ _id: categoriaId, marca, activo: true }).select('nombre'),
      TicketCategory.findById(ticket.categoria).select('nombre')
    ])
    if (!nueva) {
      res.status(400).json({ message: 'La categoría no existe, no es de tu marca o está inactiva' })
      return
    }

    ticket.categoria = nueva._id
    await ticket.save()

    await registrarEvento({
      ticket: ticket._id,
      marca: ticket.marca,
      tipo: 'categoria',
      autor: req.user!.id,
      de: anterior ? String(anterior._id) : undefined,
      deNombre: anterior?.nombre,
      a: String(nueva._id),
      aNombre: nueva.nombre
    })
    avisarCambioTicket(ticket._id)

    res.status(200).json({ message: `Categoría cambiada a ${nueva.nombre}`, ticket: await findTicketResponse(ticket._id) })
  } catch (error) {
    next(error)
  }
}

// PUT /api/tickets/:id/prioridad — admin y soporte corrigen lo que eligió el usuario, con motivo.
// La fecha límite se recalcula desde ahora; el motivo queda solo en el historial interno
export const updateTicketPrioridad = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { prioridad, motivo } = req.body
    const marca = req.user?.marca

    const ticket = await Ticket.findOne({ _id: req.params.id, marca })
    if (!ticket) {
      res.status(404).json({ message: 'Ticket no encontrado' })
      return
    }
    if (!puedeVerTicket(req.user!, ticket)) {
      res.status(403).json({ message: 'No tienes acceso a este ticket' })
      return
    }
    if (ticket.estado === 'cerrado') {
      res.status(400).json({ message: 'No se puede cambiar la prioridad de un ticket cerrado' })
      return
    }
    if (ticket.prioridad === prioridad) {
      res.status(400).json({ message: 'El ticket ya tiene esa prioridad' })
      return
    }

    const prioridadAnterior = ticket.prioridad
    const fechaLimiteAnterior = ticket.fechaLimite
    ticket.prioridad = prioridad
    ticket.fechaLimite = await fechaLimiteDeTicket(ticket.marca, ticket.area, prioridad)
    if (ticket.pausadoDesde) ticket.pausadoDesde = new Date() // el plazo nuevo empieza a contar al reanudar
    await ticket.save()

    await registrarEvento({
      ticket: ticket._id,
      marca: ticket.marca,
      tipo: 'prioridad',
      autor: req.user!.id,
      de: prioridadAnterior,
      a: prioridad,
      motivo,
      fechaLimiteAnterior,
      fechaLimiteNueva: ticket.fechaLimite
    })
    notificar(ticket._id, req.user!.id, { tipo: 'prioridad', de: prioridadAnterior, a: prioridad })
    avisarCambioTicket(ticket._id)

    res.status(200).json({ message: 'Prioridad actualizada', ticket: await findTicketResponse(ticket._id) })
  } catch (error) {
    next(error)
  }
}
