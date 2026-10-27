import { Response, NextFunction } from 'express'
import Ticket from '../models/Ticket'
import { AuthRequest } from '../middlewares/auth'
import { registrarEvento } from '../services/ticketEvents'
import { findTicketResponse } from '../services/ticketQueries'

const MOTIVO_MAX = 300
const MAX_ADELANTE_MS = 365 * 24 * 60 * 60 * 1000 // hasta un año desde ahora

// PUT /api/tickets/:id/fecha-limite — el admin de la marca ajusta la fecha límite actual.
// Sigue siendo automática al crear y al mover de área; este ajuste queda en el historial con su motivo.
export const updateFechaLimite = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id, marca } = req.user!
    const { fechaLimite, motivo } = req.body || {}

    const nueva = typeof fechaLimite === 'string' ? new Date(fechaLimite) : null
    if (!nueva || Number.isNaN(nueva.getTime())) {
      res.status(400).json({ message: 'La nueva fecha límite no es válida' })
      return
    }

    const motivoLimpio = typeof motivo === 'string' ? motivo.trim() : ''
    if (!motivoLimpio) {
      res.status(400).json({ message: 'El motivo es obligatorio' })
      return
    }
    if (motivoLimpio.length > MOTIVO_MAX) {
      res.status(400).json({ message: `El motivo no puede superar ${MOTIVO_MAX} caracteres` })
      return
    }

    const ahora = Date.now()
    if (nueva.getTime() <= ahora) {
      res.status(400).json({ message: 'La fecha límite debe ser posterior a este momento' })
      return
    }
    if (nueva.getTime() > ahora + MAX_ADELANTE_MS) {
      res.status(400).json({ message: 'La fecha límite no puede ser a más de un año' })
      return
    }

    const ticket = await Ticket.findOne({ _id: req.params.id, marca })
    if (!ticket) {
      res.status(404).json({ message: 'Ticket no encontrado' })
      return
    }

    if (ticket.estado === 'cerrado') {
      res.status(400).json({ message: 'No se puede cambiar la fecha límite de un ticket cerrado' })
      return
    }

    const anterior = ticket.fechaLimite
    if (anterior && anterior.getTime() === nueva.getTime()) {
      res.status(400).json({ message: 'Esa ya es la fecha límite del ticket' })
      return
    }

    ticket.fechaLimite = nueva
    await ticket.save()

    await registrarEvento({
      ticket: ticket._id,
      marca: ticket.marca,
      tipo: 'fecha_limite',
      autor: id,
      motivo: motivoLimpio,
      fechaLimiteAnterior: anterior,
      fechaLimiteNueva: nueva
    })

    res.status(200).json({
      message: 'Fecha límite actualizada',
      ticket: await findTicketResponse(ticket._id)
    })

  } catch (error) {
    next(error)
  }
}
