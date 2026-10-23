import { Response, NextFunction } from 'express'
import mongoose from 'mongoose'
import Ticket, { ITicket } from '../models/Ticket'
import User from '../models/User'
import { AuthRequest } from '../middlewares/auth'
import { registrarEvento } from '../services/ticketEvents'
import { findTicketResponse } from '../services/ticketQueries'

// Un observador válido: usuario activo, de la misma marca y distinto del creador
export const buscarObservadorValido = (userId: string, marca: mongoose.Types.ObjectId | string, creadorId: string) => {
  if (String(userId) === String(creadorId)) return Promise.resolve(null)
  return User.findOne({ _id: userId, rol: 'usuario', estado: 'activo', marca }).select('nombre')
}

// Gestionan observadores el creador y el admin de la marca
const puedeGestionar = (req: AuthRequest, ticket: ITicket): boolean =>
  req.user!.rol === 'admin' || String(ticket.creadoPor) === req.user!.id

// POST /api/tickets/:id/observers { userId } — agregar observador
export const addObserver = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { userId } = req.body || {}
    if (!userId) {
      res.status(400).json({ message: 'El usuario es obligatorio' })
      return
    }

    const ticket = await Ticket.findOne({ _id: req.params.id, marca: req.user!.marca })
    if (!ticket) {
      res.status(404).json({ message: 'Ticket no encontrado' })
      return
    }

    if (!puedeGestionar(req, ticket)) {
      res.status(403).json({ message: 'Solo el creador o el admin pueden agregar observadores' })
      return
    }

    if (ticket.observadores.some((o) => String(o) === String(userId))) {
      res.status(400).json({ message: 'Ese usuario ya es observador del ticket' })
      return
    }

    const observador = await buscarObservadorValido(userId, ticket.marca, String(ticket.creadoPor))
    if (!observador) {
      res.status(400).json({ message: 'Solo se pueden agregar usuarios activos de tu marca (distintos del creador)' })
      return
    }

    ticket.observadores.push(observador._id)
    await ticket.save()

    await registrarEvento({
      ticket: ticket._id,
      marca: ticket.marca,
      tipo: 'observador_agregado',
      autor: req.user!.id,
      a: String(observador._id),
      aNombre: observador.nombre
    })

    res.status(200).json({ message: 'Observador agregado', ticket: await findTicketResponse(ticket._id) })

  } catch (error) {
    next(error)
  }
}

// DELETE /api/tickets/:id/observers/:userId — quitar observador (creador o admin) o salirse (el propio observador)
export const removeObserver = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = String(req.params.userId)
    const seSale = userId === req.user!.id

    const ticket = await Ticket.findOne({ _id: req.params.id, marca: req.user!.marca })
    if (!ticket) {
      res.status(404).json({ message: 'Ticket no encontrado' })
      return
    }

    if (!seSale && !puedeGestionar(req, ticket)) {
      res.status(403).json({ message: 'Solo el creador o el admin pueden quitar observadores' })
      return
    }

    if (!ticket.observadores.some((o) => String(o) === userId)) {
      res.status(404).json({ message: 'Ese usuario no es observador del ticket' })
      return
    }

    const observador = await User.findById(userId).select('nombre')

    ticket.observadores = ticket.observadores.filter((o) => String(o) !== userId)
    await ticket.save()

    await registrarEvento({
      ticket: ticket._id,
      marca: ticket.marca,
      tipo: 'observador_quitado',
      autor: req.user!.id,
      de: userId,
      deNombre: observador?.nombre,
      motivo: seSale ? 'Dejó de seguir el ticket' : undefined
    })

    // Quien se sale ya no puede ver el ticket: no se le devuelve
    res.status(200).json({
      message: seSale ? 'Dejaste de seguir el ticket' : 'Observador quitado',
      ticket: seSale ? null : await findTicketResponse(ticket._id)
    })

  } catch (error) {
    next(error)
  }
}
