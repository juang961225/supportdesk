import mongoose, { Document, Schema } from 'mongoose'

// Interfaz — define la forma del objeto en TypeScript
export interface IUser extends Document {
  nombre: string
  email: string
  password: string
  rol: 'superadmin' | 'admin' | 'soporte' | 'usuario'
  estado: 'activo' | 'inactivo'
  marca?: mongoose.Types.ObjectId  // ← opcional, SuperAdmin no la tiene
  createdAt: Date
}

// Schema — define la estructura en MongoDB
const UserSchema = new Schema<IUser>(
  {
    nombre: {
      type: String,
      required: [true, 'El nombre es obligatorio'],
      trim: true
    },
    email: {
      type: String,
      required: [true, 'El email es obligatorio'],
      unique: true,
      lowercase: true,
      trim: true
    },
    password: {
      type: String,
      required: [true, 'La contraseña es obligatoria'],
      minlength: 6
    },
    rol: {
      type: String,
      enum: ['superadmin', 'admin', 'soporte', 'usuario'],
      default: 'usuario'
    },
    estado: {
      type: String,
      enum: ['activo', 'inactivo'],
      default: 'activo'
    },
    marca: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Brand',  // referencia al modelo Brand
      required: false // opcional — superadmin no tiene marca
    }
  },
  {
    timestamps: true // agrega createdAt y updatedAt automáticamente
  }
)

export default mongoose.model<IUser>('User', UserSchema)