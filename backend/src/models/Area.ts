import mongoose, { Document, Schema } from 'mongoose'

export interface IArea extends Document {
  nombre: string
  descripcion?: string
  marca: mongoose.Types.ObjectId
  activo: boolean
}

const AreaSchema = new Schema<IArea>(
  {
    nombre: {
      type: String,
      required: [true, 'El nombre del área es obligatorio'],
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

// Un nombre de área no se repite dentro de la misma marca
AreaSchema.index({ marca: 1, nombre: 1 }, { unique: true })

export default mongoose.model<IArea>('Area', AreaSchema)
