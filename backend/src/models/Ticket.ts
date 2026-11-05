import mongoose, { Document, Schema } from 'mongoose'
import { Adjunto, AdjuntoSchema } from '../services/attachments'
import { ContextoTicket } from '../utils/contextoUsuario'
import { AvisosPlazo } from '../utils/tareas'

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
  submarca?: mongoose.Types.ObjectId // la principal: gráficas, totales y concesionario
  submarcasRelacionadas: mongoose.Types.ObjectId[] // otras a las que también afecta (solo para encontrarlo)
  contexto?: ContextoTicket // copia al crear: no cambia si después cambia el usuario
  area?: mongoose.Types.ObjectId // área actual (puede diferir de la de su categoría tras moverlo)
  fechaLimite?: Date // plazo del ticket: lo que se promete al cliente; no se reinicia al mover
  fechaLimiteArea?: Date // plazo del tramo en el área actual; sin valor en tickets anteriores: vale fechaLimite
  fechaCierre?: Date
  pausadoDesde?: Date // en Esperando al usuario o Resuelto: desde cuándo está detenido el plazo
  avisosPlazo?: AvisosPlazo // avisos automáticos ya enviados: cada uno guarda la fecha a la que se refiere
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
    submarcasRelacionadas: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'SubMarca' }],
      default: []
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
    fechaLimiteArea: {
      type: Date
    },
    fechaCierre: {
      type: Date
    },
    pausadoDesde: {
      type: Date
    },
    avisosPlazo: {
      type: new Schema<AvisosPlazo>(
        { ticketPronto: Date, ticketVencido: Date, areaPronto: Date, areaVencido: Date, recordatorio: Date },
        { _id: false }
      )
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
TicketSchema.index({ marca: 1, submarcasRelacionadas: 1 })
TicketSchema.index({ marca: 1, 'contexto.nombre': 1 })
TicketSchema.index({ marca: 1, 'contexto.organizacion': 1 })

export default mongoose.model<ITicket>('Ticket', TicketSchema)