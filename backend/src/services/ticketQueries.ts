import mongoose from 'mongoose'
import Ticket from '../models/Ticket'

// Ticket con las referencias que necesita el frontend (mismo formato en todas las respuestas)
export const findTicketResponse = (id: mongoose.Types.ObjectId | string) =>
  Ticket.findById(id)
    .populate('asignadoA', 'nombre email')
    .populate('categoria', 'nombre descripcion')
    .populate('creadoPor', 'nombre email')
    .populate('marca', 'nombre')
    .populate('area', 'nombre')
