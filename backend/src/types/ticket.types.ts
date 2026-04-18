import mongoose from 'mongoose'

export interface PopulatedTicket {
  marca: { _id: mongoose.Types.ObjectId }
  creadoPor: { _id: mongoose.Types.ObjectId }
  asignadoA?: { _id: mongoose.Types.ObjectId }
}
