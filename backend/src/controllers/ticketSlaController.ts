import { Response, NextFunction } from 'express'
import Ticket from '../models/Ticket'
import { AuthRequest } from '../middlewares/auth'
import { puedeVerTicket } from '../utils/ticketAccess'
import { tramosDeTicket } from '../services/tramos'

// GET /api/tickets/:id/tramos — tiempo laboral y SLA por área (admin, soporte y superadmin)
export const getTicketTramos = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const ticket = await Ticket.findById(req.params.id)
    if (!ticket) {
      res.status(404).json({ message: 'Ticket no encontrado' })
      return
    }

    if (!puedeVerTicket(req.user!, ticket)) {
      res.status(403).json({ message: 'No tienes acceso a este ticket' })
      return
    }

    res.status(200).json({ tramos: await tramosDeTicket(ticket._id) })

  } catch (error) {
    next(error)
  }
}
