import mongoose, { Document, Schema } from 'mongoose'

// Interfaz — define la forma del objeto en TypeScript
export interface IUser extends Document {
  nombre: string
  email: string
  password: string
  rol: 'superadmin' | 'admin' | 'soporte' | 'usuario'
  estado: 'activo' | 'inactivo'
  marca?: mongoose.Types.ObjectId  // ← opcional, SuperAdmin no la tiene
  areas: mongoose.Types.ObjectId[] // solo soporte: áreas a las que pertenece
  // 'online_brief': el usuario y su contraseña se administran en Online Brief (no se cambian aquí)
  origen: 'local' | 'online_brief'
  onlineBriefId?: string // _id del usuario en Online Brief (migración / sincronización)
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
    origen: {
      type: String,
      enum: ['local', 'online_brief'],
      default: 'local'
    },
    onlineBriefId: {
      type: String
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
    },
    areas: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Area' }],
      default: []
    }
  },
  {
    timestamps: true // agrega createdAt y updatedAt automáticamente
  }
)

// Soportes/admins activos de una marca (asignar, notificaciones, dashboards)
UserSchema.index({ marca: 1, rol: 1, estado: 1 })

// Un usuario de Online Brief se migra una sola vez (los locales no tienen este campo)
UserSchema.index({ onlineBriefId: 1 }, { unique: true, partialFilterExpression: { onlineBriefId: { $type: 'string' } } })
export default mongoose.model<IUser>('User', UserSchema)