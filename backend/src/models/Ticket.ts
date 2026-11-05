import mongoose, { Document, Schema } from 'mongoose'
import { Adjunto, AdjuntoSchema } from '../services/attachments'
import { ContextoTicket } from '../utils/contextoUsuario'

export interface ITicket extends Document {
  titulo: string
  descripcion: string
  estado: 'abierto' | 'en_progreso' | 'en_revision' | 'esperando_usuario' | 'resuelto' | 'cerrado' | 'reabierto'
  prioridad: 'baja' | 'media' | 'alta' | 'critica'
  categoria: mongoose.Types.ObjectId
  archivos: Adjunto[]
  creadoPor: mongoose.Types.ObjectId
  asignadoA?: mongoose.Types.ObjectId
  marca: mongoose.Types.ObjectId
  observadores: mongoose.Types.ObjectId[] // usuarios que siguen el ticket (ven y comentan)
  submarca?: mongoose.Types.ObjectId
  contexto?: ContextoTicket // copia al crear: no cambia si después cambia el usuario
  area?: mongoose.Types.ObjectId // área actual (puede diferir de la de su categoría tras moverlo)
  fechaLimite?: Date
  fechaCierre?: Date
  pausadoDesde?: Date // en Esperando al usuario o Resuelto: desde cuándo está detenido el plazo
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
      enum: ['abierto', 'en_progreso', 'en_revision', 'esperando_usuario', 'resuelto', 'cerrado', 'reabierto'],
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
      type: [AdjuntoSchema],
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
    observadores: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
      default: []
    },
    area: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Area'
    },
    // Obligatoria al crear (validacion/esquemas); opcional aquí por los tickets anteriores a la migración
    submarca: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SubMarca'
    },
    contexto: {
      type: new Schema<ContextoTicket>(
        { organizacion: String, tipo: String, clave: String, nombre: String },
        { _id: false }
      )
    },
    fechaLimite: {
      type: Date
    },
    fechaCierre: {
      type: Date
    },
    pausadoDesde: {
      type: Date
    }
  },
  {
    timestamps: true
  }
)

// Tickets que sigue un observador
TicketSchema.index({ observadores: 1 })

// Cola de cada área: tickets por marca, área y estado
TicketSchema.index({ marca: 1, area: 1, estado: 1 })
// Lista de tickets (por marca, de más nuevo a más viejo), "mis tickets" del usuario, tickets de un soporte
// y SLA por área (tickets actualizados en el periodo)
TicketSchema.index({ marca: 1, createdAt: -1 })
TicketSchema.index({ creadoPor: 1, createdAt: -1 })
TicketSchema.index({ asignadoA: 1, estado: 1 })
TicketSchema.index({ marca: 1, updatedAt: -1 })
TicketSchema.index({ marca: 1, submarca: 1 })
TicketSchema.index({ marca: 1, 'contexto.nombre': 1 })
TicketSchema.index({ marca: 1, 'contexto.organizacion': 1 })

export default mongoose.model<ITicket>('Ticket', TicketSchema)