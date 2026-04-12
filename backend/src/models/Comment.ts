import mongoose, { Document, Schema } from 'mongoose'

export interface IComment extends Document {
  contenido: string
  ticket: mongoose.Types.ObjectId
  autor: mongoose.Types.ObjectId
  archivos: string[]
}

const CommentSchema = new Schema<IComment>(
  {
    contenido: {
      type: String,
      required: [true, 'El contenido es obligatorio'],
      trim: true
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
      type: [String],
      default: []
    }
  },
  {
    timestamps: true // createdAt y updatedAt automáticos
  }
)

export default mongoose.model<IComment>('Comment', CommentSchema)
