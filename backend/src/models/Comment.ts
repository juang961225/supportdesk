import mongoose, { Document, Schema } from 'mongoose'
import { Adjunto, AdjuntoSchema } from '../services/attachments'

export interface IComment extends Document {
  contenido: string
  ticket: mongoose.Types.ObjectId
  autor: mongoose.Types.ObjectId
  archivos: Adjunto[]
}

const CommentSchema = new Schema<IComment>(
  {
    contenido: {
      type: String,
      // Puede ir vacío si el comentario trae adjuntos (lo valida el controller)
      trim: true,
      default: ''
    },
    ticket: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ticket',
      required: true
    },
    autor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    archivos: {
      type: [AdjuntoSchema],
      default: []
    }
  },
  {
    timestamps: true // createdAt y updatedAt automáticos
  }
)

// Hilo de un ticket en orden
CommentSchema.index({ ticket: 1, createdAt: 1 })

export default mongoose.model<IComment>('Comment', CommentSchema)
