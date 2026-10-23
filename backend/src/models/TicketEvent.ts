import mongoose, { Document, Schema } from 'mongoose'

// Tipos de evento del historial interno
export type TipoEvento =
  | 'creado' | 'asignado' | 'reasignado' | 'estado' | 'desasignado'
  | 'tomado' | 'soltado' | 'pasado' | 'movido'
  | 'observador_agregado' | 'observador_quitado'

export interface ITicketEvent extends Document {
  ticket: mongoose.Types.ObjectId
  marca: mongoose.Types.ObjectId
  tipo: TipoEvento
  autor: mongoose.Types.ObjectId
  de?: string       // id o estado anterior
  a?: string        // id o estado nuevo
  deNombre?: string // nombres del momento: se conservan aunque luego cambien
  aNombre?: string
  motivo?: string
  fechaLimiteAnterior?: Date // en 'movido': para calcular tramos por área (Fase 2)
  createdAt: Date
}

const TicketEventSchema = new Schema<ITicketEvent>(
  {
    ticket: { type: mongoose.Schema.Types.ObjectId, ref: 'Ticket', required: true },
    marca: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand', required: true },
    tipo: {
      type: String,
      enum: ['creado', 'asignado', 'reasignado', 'estado', 'desasignado', 'tomado', 'soltado', 'pasado', 'movido', 'observador_agregado', 'observador_quitado'],
      required: true
    },
    autor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    de: { type: String },
    a: { type: String },
    deNombre: { type: String },
    aNombre: { type: String },
    motivo: { type: String },
    fechaLimiteAnterior: { type: Date }
  },
  {
    // Historial append-only: solo fecha de creación
    timestamps: { createdAt: true, updatedAt: false }
  }
)

TicketEventSchema.index({ ticket: 1, createdAt: 1 })

export default mongoose.model<ITicketEvent>('TicketEvent', TicketEventSchema)
