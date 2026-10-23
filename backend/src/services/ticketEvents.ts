import mongoose from 'mongoose'
import TicketEvent, { TipoEvento } from '../models/TicketEvent'

interface NuevoEvento {
  ticket: mongoose.Types.ObjectId
  marca: mongoose.Types.ObjectId
  tipo: TipoEvento
  autor: mongoose.Types.ObjectId | string
  de?: string
  a?: string
  deNombre?: string
  aNombre?: string
  motivo?: string
  fechaLimiteAnterior?: Date
}

// Registra una acción en el historial interno del ticket
export const registrarEvento = async (evento: NuevoEvento): Promise<void> => {
  await TicketEvent.create(evento)
}
