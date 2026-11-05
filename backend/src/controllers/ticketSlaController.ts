import { Response, NextFunction } from 'express'
import mongoose from 'mongoose'
import Ticket from '../models/Ticket'
import { AuthRequest } from '../middlewares/auth'
import { puedeVerTicket } from '../utils/ticketAccess'
import { tramosDeTicket } from '../services/tramos'
import { horarioDeMarca } from '../services/horario'
import { relojDe } from '../utils/fechaLimite'

// GET /api/tickets/:id/tramos — tiempo laboral y SLA por área (admin, soporte y superadmin)
export const getTicketTramos = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Una sola lectura: lo que pide el control de acceso + lo que necesitan los tramos
    const ticket = await Ticket.findById(req.params.id)
      .select('createdAt estado prioridad fechaCierre fechaLimite fechaLimiteArea area marca creadoPor asignadoA observadores')
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

    const [tramos, horario] = await Promise.all([tramosDeTicket(ticket), horarioDeMarca(ticket.marca)])
    // En Crítica el tiempo son horas seguidas, no días de jornada
    res.status(200).json({ tramos, minutosJornada: relojDe(ticket.prioridad, horario).minutosJornada })

  } catch (error) {
    next(error)
  }
}
