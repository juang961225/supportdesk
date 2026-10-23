import mongoose from 'mongoose'
import Ticket from '../models/Ticket'
import { firmarAdjuntos } from './attachments'

// Ticket con las referencias que necesita el frontend (mismo formato en todas las respuestas)
// y los adjuntos con su URL firmada temporal
export const findTicketResponse = async (id: mongoose.Types.ObjectId | string) => {
  const ticket = await Ticket.findById(id)
    .populate('asignadoA', 'nombre email')
    .populate('categoria', 'nombre descripcion')
    .populate('creadoPor', 'nombre email')
    .populate('marca', 'nombre')
    .populate('area', 'nombre')
    .populate('observadores', 'nombre email')

  if (!ticket) return null
  return { ...ticket.toObject(), archivos: await firmarAdjuntos(ticket.archivos) }
}
