import mongoose, { Document, Schema } from 'mongoose'

export interface IBrand extends Document {
  nombre: string
  slug: string
  logo?: string
  estado: 'activo' | 'inactivo'
  admin?: mongoose.Types.ObjectId
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
    }
  },
  {
    timestamps: true
  }
)

export default mongoose.model<IBrand>('Brand', BrandSchema)