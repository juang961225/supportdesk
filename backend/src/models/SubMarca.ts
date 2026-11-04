import mongoose, { Document, Schema } from 'mongoose'

// Sub-marca dentro de una marca (ej. BMW, MINI y BMW Motorrad dentro de la marca BMW).
// Clasifica los tickets y limita de cuáles puede crear cada usuario. La administra el admin de la marca.
export interface ISubMarca extends Document {
  nombre: string
  marca: mongoose.Types.ObjectId
  activo: boolean
  onlineBriefId?: number // id en Online Brief (brand_id), para sincronizar usuarios
}

const SubMarcaSchema = new Schema<ISubMarca>(
  {
    nombre: {
      type: String,
      required: [true, 'El nombre de la sub-marca es obligatorio'],
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
    onlineBriefId: {
      type: Number
    }
  },
  {
    timestamps: true
  }
)

// Un nombre de sub-marca no se repite dentro de la misma marca
SubMarcaSchema.index({ marca: 1, nombre: 1 }, { unique: true })

export default mongoose.model<ISubMarca>('SubMarca', SubMarcaSchema)
