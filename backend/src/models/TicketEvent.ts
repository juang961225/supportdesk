import mongoose, { Document, Schema } from 'mongoose'

// Tipos de evento del historial interno
export type TipoEvento =
  | 'creado' | 'asignado' | 'reasignado' | 'estado' | 'desasignado'
  | 'tomado' | 'soltado' | 'pasado' | 'movido'
  | 'observador_agregado' | 'observador_quitado'
  | 'fecha_limite' | 'editado' | 'categoria' | 'prioridad' | 'submarcas'

export interface ITicketEvent extends Document {
  ticket: mongoose.Types.ObjectId
  marca: mongoose.Types.ObjectId
  tipo: TipoEvento
  autor?: mongoose.Types.ObjectId // sin autor: lo hizo el sistema (cierres automáticos)
  de?: string       // id o estado anterior
  a?: string        // id o estado nuevo
  deNombre?: string // nombres del momento: se conservan aunque luego cambien (en 'submarcas': la lista separada por comas)
  aNombre?: string
  motivo?: string
  fechaLimiteAnterior?: Date // en 'movido', 'fecha_limite' y 'prioridad': para calcular tramos por área (F2-4)
  fechaLimiteNueva?: Date    // en 'fecha_limite': la que puso el admin
  fechaLimiteAreaAnterior?: Date // plazo del tramo antes del cambio (en tickets anteriores: fechaLimiteAnterior)
  descripcionAnterior?: string // en 'editado': el texto que tenía antes
  createdAt: Date
}

const TicketEventSchema = new Schema<ITicketEvent>(
  {
    ticket: { type: mongoose.Schema.Types.ObjectId, ref: 'Ticket', required: true },
    marca: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand', required: true },
    tipo: {
      type: String,
      enum: ['creado', 'asignado', 'reasignado', 'estado', 'desasignado', 'tomado', 'soltado', 'pasado', 'movido', 'observador_agregado', 'observador_quitado', 'fecha_limite', 'editado', 'categoria', 'prioridad', 'submarcas'],
      required: true
    },
    autor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    de: { type: String },
    a: { type: String },
    deNombre: { type: String },
    aNombre: { type: String },
    motivo: { type: String },
    fechaLimiteAnterior: { type: Date },
    fechaLimiteNueva: { type: Date },
    fechaLimiteAreaAnterior: { type: Date },
    descripcionAnterior: { type: String }
  },
  {
    // Historial append-only: solo fecha de creación
    timestamps: { createdAt: true, updatedAt: false }
  }
)

TicketEventSchema.index({ ticket: 1, createdAt: 1 })

export default mongoose.model<ITicketEvent>('TicketEvent', TicketEventSchema)
