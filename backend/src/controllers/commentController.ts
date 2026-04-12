import { Response, NextFunction } from 'express'
import Comment from '../models/Comment'
import Ticket from '../models/Ticket'
import { AuthRequest } from '../middlewares/auth'
import mongoose from 'mongoose'

// POST /api/tickets/:id/comments — agregar comentario
export const createComment = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { contenido } = req.body || {}

    if (!contenido) {
      res.status(400).json({ message: 'El contenido es obligatorio' })
      return
    }

    // Verificar que el ticket existe y el usuario tiene acceso
    const ticket = await Ticket.findById(req.params.id)
    if (!ticket) {
      res.status(404).json({ message: 'Ticket no encontrado' })
      return
    }

    const { rol, id, marca } = req.user!

    // Verificar acceso al ticket según rol
    const tieneAcceso =
      rol === 'superadmin' ||
      (rol === 'admin' && String(ticket.marca) === String(marca)) ||
      (rol === 'soporte' && String(ticket.asignadoA) === String(id)) ||
      (rol === 'usuario' && String(ticket.creadoPor) === String(id))

    if (!tieneAcceso) {
      res.status(403).json({ message: 'No tienes acceso a este ticket' })
      return
    }

    const comment = await Comment.create({
      contenido,
      ticket: new mongoose.Types.ObjectId(req.params.id as string),
      autor: new mongoose.Types.ObjectId(id)
    })

    // Populate para devolver datos completos
    const commentPopulado = await Comment.findById(comment._id)
      .populate('autor', 'nombre email rol')

    res.status(201).json({
      message: 'Comentario agregado exitosamente',
      comment: commentPopulado
    })

  } catch (error) {
    next(error)
  }
}

// GET /api/tickets/:id/comments — ver historial del ticket
export const getComments = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Verificar que el ticket existe
    const ticket = await Ticket.findById(req.params.id)
    if (!ticket) {
      res.status(404).json({ message: 'Ticket no encontrado' })
      return
    }

    const { rol, id, marca } = req.user!

    // Verificar acceso al ticket según rol
    const tieneAcceso =
      rol === 'superadmin' ||
      (rol === 'admin' && String(ticket.marca) === String(marca)) ||
      (rol === 'soporte' && String(ticket.asignadoA) === String(id)) ||
      (rol === 'usuario' && String(ticket.creadoPor) === String(id))

    if (!tieneAcceso) {
      res.status(403).json({ message: 'No tienes acceso a este ticket' })
      return
    }

    const comments = await Comment.find({
      ticket: new mongoose.Types.ObjectId(req.params.id as string)
    })
      .populate('autor', 'nombre email rol')
      .sort({ createdAt: 1 }) // más antiguos primero — orden cronológico

    res.status(200).json({ comments })

  } catch (error) {
    next(error)
  }
}
