import mongoose, { Document, Schema } from 'mongoose'

export interface ITicketCategory extends Document {
  nombre: string
  descripcion?: string
  marca: mongoose.Types.ObjectId
  area: mongoose.Types.ObjectId // área inicial de los tickets de esta categoría
  activo: boolean
}

const TicketCategorySchema = new Schema<ITicketCategory>(
  {
    nombre: {
      type: String,
      required: [true, 'El nombre de la categoría es obligatorio'],
      trim: true
    },
    descripcion: {
      type: String,
      trim: true
    },
    marca: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Brand',
      required: true
    },
    area: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Area'
      // obligatorio al crear/editar (controller); no en el schema para no romper datos previos a la migración
    },
    activo: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
)

export default mongoose.model<ITicketCategory>('TicketCategory', TicketCategorySchema)