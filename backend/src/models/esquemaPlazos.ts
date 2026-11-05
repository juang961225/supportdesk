import { Schema } from 'mongoose'

// Plazos por prioridad, compartidos por la marca (base) y el área (ajuste). Ver utils/fechaLimite
const PlazoSchema = new Schema(
  {
    valor: { type: Number, required: true, min: 1 },
    unidad: { type: String, enum: ['horas', 'dias'], required: true }
  },
  { _id: false }
)

export const PlazosSchema = new Schema(
  {
    critica: { type: PlazoSchema, default: undefined },
    alta: { type: PlazoSchema, default: undefined },
    media: { type: PlazoSchema, default: undefined },
    baja: { type: PlazoSchema, default: undefined }
  },
  { _id: false }
)
