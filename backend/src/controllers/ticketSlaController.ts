import { Response, NextFunction } from 'express'
import mongoose from 'mongoose'
import Ticket from '../models/Ticket'
import { AuthRequest } from '../middlewares/auth'
import { puedeVerTicket } from '../utils/ticketAccess'
import { tramosDeTicket } from '../services/tramos'

// GET /api/tickets/:id/tramos — tiempo laboral y SLA por área (admin, soporte y superadmin)
export const getTicketTramos = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Una sola lectura: lo que pide el control de acceso + lo que necesitan los tramos
    const ticket = await Ticket.findById(req.params.id)
      .select('createdAt estado fechaCierre fechaLimite area marca creadoPor asignadoA observadores')
      .populate('area', 'nombre')
      .lean<Parameters<typeof tramosDeTicket>[0] & { creadoPor: mongoose.Types.ObjectId; asignadoA?: mongoose.Types.ObjectId; observadores?: mongoose.Types.ObjectId[] }>()
    if (!ticket) {
      res.status(404).json({ message: 'Ticket no encontrado' })
      return
    }

    if (!puedeVerTicket(req.user!, ticket)) {
      res.status(403).json({ message: 'No tienes acceso a este ticket' })
      return
    }

    res.status(200).json({ tramos: await tramosDeTicket(ticket) })

  } catch (error) {
    next(error)
  }
}
