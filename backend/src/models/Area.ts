import mongoose, { Document, Schema } from 'mongoose'
import { AjustePlazos } from '../utils/fechaLimite'
import { PlazosSchema } from './esquemaPlazos'

export interface IArea extends Document {
  nombre: string
  descripcion?: string
  marca: mongoose.Types.ObjectId
  activo: boolean
  plazos?: AjustePlazos // ajuste por prioridad; lo que falte viene de la marca
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
    },
    plazos: { type: PlazosSchema, default: undefined }
  },
  {
    timestamps: true
  }
)

// Un nombre de área no se repite dentro de la misma marca
AreaSchema.index({ marca: 1, nombre: 1 }, { unique: true })

export default mongoose.model<IArea>('Area', AreaSchema)
