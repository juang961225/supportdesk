import mongoose, { Document, Schema } from 'mongoose'

// Refresh token de sesión. Solo se guarda su hash (sha256): el token en claro viaja únicamente en la cookie
export interface IRefreshToken extends Document {
  usuario: mongoose.Types.ObjectId
  tokenHash: string
  expiraEn: Date
  revocadoEn?: Date   // al rotar, cerrar sesión o desactivar al usuario
  createdAt: Date
}

const RefreshTokenSchema = new Schema<IRefreshToken>(
  {
    usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    expiraEn: { type: Date, required: true },
    revocadoEn: { type: Date }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
)

// MongoDB borra solo los tokens vencidos
RefreshTokenSchema.index({ expiraEn: 1 }, { expireAfterSeconds: 0 })

export default mongoose.model<IRefreshToken>('RefreshToken', RefreshTokenSchema)
