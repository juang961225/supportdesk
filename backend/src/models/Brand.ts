import mongoose, { Document, Schema } from 'mongoose'
import { HorarioLaboral, HORARIO_POR_DEFECTO } from '../utils/horarioLaboral'

export interface IBrand extends Document {
  nombre: string
  slug: string
  logo?: string
  estado: 'activo' | 'inactivo'
  admin?: mongoose.Types.ObjectId
  horario: HorarioLaboral // para fechas límite y SLA (lo ajusta el admin)
  createdAt: Date
}

const BrandSchema = new Schema<IBrand>(
  {
    nombre: {
      type: String,
      required: [true, 'El nombre de la marca es obligatorio'],
      unique: true,
      trim: true
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
      // ejemplo: "BMW" → "bmw", "Banco de Bogotá" → "banco-de-bogota"
    },
    logo: {
      type: String // URL de la imagen en Cloudinary
    },
    estado: {
      type: String,
      enum: ['activo', 'inactivo'],
      default: 'activo'
    },
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User' // referencia al modelo User
    },
    horario: {
      dias: { type: [Number], default: () => [...HORARIO_POR_DEFECTO.dias] },
      inicio: { type: String, default: HORARIO_POR_DEFECTO.inicio },
      fin: { type: String, default: HORARIO_POR_DEFECTO.fin },
      pausa: {
        type: new Schema({ inicio: { type: String, required: true }, fin: { type: String, required: true } }, { _id: false }),
        default: null
      },
      festivos: { type: [String], default: () => [] }
    }
  },
  {
    timestamps: true
  }
)

export default mongoose.model<IBrand>('Brand', BrandSchema)