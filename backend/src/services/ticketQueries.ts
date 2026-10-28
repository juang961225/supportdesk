import mongoose from 'mongoose'
import Ticket from '../models/Ticket'
import { firmarAdjuntos } from './attachments'
import { conSla } from './slaActual'

// Ticket con las referencias que necesita el frontend (mismo formato en todas las respuestas)
// y los adjuntos con su URL firmada temporal y el SLA actual (barra de plazo)
export const findTicketResponse = async (id: mongoose.Types.ObjectId | string) => {
  const ticket = await Ticket.findById(id)
    .populate('asignadoA', 'nombre email')
    .populate('categoria', 'nombre descripcion')
    .populate('creadoPor', 'nombre email')
    .populate('marca', 'nombre')
    .populate('area', 'nombre')
    .populate('observadores', 'nombre email')

  if (!ticket) return null
  const [conSuSla] = await conSla([ticket.toObject()])
  return { ...conSuSla, archivos: await firmarAdjuntos(ticket.archivos) }
}
