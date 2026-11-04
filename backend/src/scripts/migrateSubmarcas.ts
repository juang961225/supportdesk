// Migración a sub-marcas: crea las sub-marcas iniciales de cada marca, asigna la primera a los tickets
// que no tienen y da todas las activas a los usuarios sin sub-marcas (para pruebas).
// Idempotente: se puede correr varias veces sin duplicar nada.
// Uso: npm run migrate:submarcas
import dotenv from 'dotenv'
import mongoose from 'mongoose'
import Brand from '../models/Brand'
import SubMarca from '../models/SubMarca'
import User from '../models/User'
import Ticket from '../models/Ticket'
import { submarcasIniciales } from '../utils/submarcasIniciales'

dotenv.config()

const migrarMarca = async (marcaId: mongoose.Types.ObjectId, marcaNombre: string): Promise<void> => {
  const iniciales = submarcasIniciales(marcaNombre)
  for (const inicial of iniciales) {
    const existe = await SubMarca.exists({ marca: marcaId, nombre: inicial.nombre })
    if (!existe) await SubMarca.create({ ...inicial, marca: marcaId })
  }

  const porDefecto = await SubMarca.findOne({ marca: marcaId, nombre: iniciales[0].nombre })
  const activas = await SubMarca.find({ marca: marcaId, activo: true }).select('_id')
  if (!porDefecto) return

  const tickets = await Ticket.updateMany(
    { marca: marcaId, $or: [{ submarca: { $exists: false } }, { submarca: null }] },
    { submarca: porDefecto._id }
  )
  const usuarios = await User.updateMany(
    { marca: marcaId, rol: 'usuario', $or: [{ submarcas: { $exists: false } }, { submarcas: { $size: 0 } }] },
    { submarcas: activas.map((s) => s._id) }
  )

  console.log(
    `[${marcaNombre}] sub-marcas: ${activas.length} · por defecto "${porDefecto.nombre}" → ` +
    `tickets: ${tickets.modifiedCount}, usuarios: ${usuarios.modifiedCount}`
  )
}

const main = async (): Promise<void> => {
  await mongoose.connect(process.env.MONGODB_URI as string)

  const marcas = await Brand.find().select('nombre')
  for (const marca of marcas) {
    await migrarMarca(marca._id, marca.nombre)
  }

  console.log(`Migración terminada (${marcas.length} marcas)`)
  await mongoose.disconnect()
}

main().catch(async (error) => {
  console.error('Error en la migración:', error)
  await mongoose.disconnect()
  process.exit(1)
})
