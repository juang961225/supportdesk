import mongoose, { Document, Schema } from 'mongoose'

export interface ITicket extends Document {
  titulo: string
  descripcion: string
  estado: 'abierto' | 'en_progreso' | 'en_revision' | 'cerrado' | 'reabierto'
  prioridad: 'baja' | 'media' | 'alta' | 'critica'
  categoria: mongoose.Types.ObjectId
  archivos: string[]
  creadoPor: mongoose.Types.ObjectId
  asignadoA?: mongoose.Types.ObjectId
  marca: mongoose.Types.ObjectId
  area?: mongoose.Types.ObjectId // área actual (puede diferir de la de su categoría tras moverlo)
  fechaLimite?: Date
  fechaCierre?: Date
  createdAt: Date
}

const TicketSchema = new Schema<ITicket>(
  {
    titulo: {
      type: String,
      required: [true, 'El título es obligatorio'],
      trim: true
    },
    descripcion: {
      type: String,
      required: [true, 'La descripción es obligatoria'],
      trim: true
    },
    estado: {
      type: String,
      enum: ['abierto', 'en_progreso', 'en_revision', 'cerrado', 'reabierto'],
      default: 'abierto'
    },
    prioridad: {
      type: String,
      enum: ['baja', 'media', 'alta', 'critica'],
      required: [true, 'La prioridad es obligatoria']
    },
    categoria: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TicketCategory',
      required: [true, 'La categoría es obligatoria']
    },
    archivos: {
      type: [String],
      default: []
    },
    creadoPor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    asignadoA: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    marca: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Brand',
      required: true
    },
    area: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Area'
    },
    fechaLimite: {
      type: Date
    },
    fechaCierre: {
      type: Date
    }
  },
  {
    timestamps: true
  }
)

// Cola de cada área: tickets por marca, área y estado
TicketSchema.index({ marca: 1, area: 1, estado: 1 })

export default mongoose.model<ITicket>('Ticket', TicketSchema)