import mongoose, { Document, Schema } from 'mongoose'

export interface ITicketCategory extends Document {
  nombre: string
  descripcion?: string
  marca: mongoose.Types.ObjectId
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