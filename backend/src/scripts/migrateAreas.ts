// Migración a áreas: crea un área "General" por marca y la asigna a
// categorías sin área, soportes sin áreas y tickets sin área.
// Idempotente: se puede correr varias veces sin duplicar nada.
// Uso: npm run migrate:areas
import dotenv from 'dotenv'
import mongoose from 'mongoose'
import Brand from '../models/Brand'
import Area from '../models/Area'
import TicketCategory from '../models/TicketCategory'
import User from '../models/User'
import Ticket from '../models/Ticket'

dotenv.config()

const NOMBRE_AREA = 'General'

const sinArea = { $or: [{ area: { $exists: false } }, { area: null }] }

const migrarMarca = async (marcaId: mongoose.Types.ObjectId, marcaNombre: string): Promise<void> => {
  let area = await Area.findOne({ marca: marcaId, nombre: NOMBRE_AREA })
  if (!area) {
    area = await Area.create({
      nombre: NOMBRE_AREA,
      descripcion: 'Área creada en la migración; reorganizar desde Áreas',
      marca: marcaId
    })
  }

  const categorias = await TicketCategory.updateMany({ marca: marcaId, ...sinArea }, { area: area._id })
  const soportes = await User.updateMany(
    { marca: marcaId, rol: 'soporte', $or: [{ areas: { $exists: false } }, { areas: { $size: 0 } }] },
    { areas: [area._id] }
  )
  const tickets = await Ticket.updateMany({ marca: marcaId, ...sinArea }, { area: area._id })

  console.log(
    `[${marcaNombre}] área "${NOMBRE_AREA}" → categorías: ${categorias.modifiedCount}, ` +
    `soportes: ${soportes.modifiedCount}, tickets: ${tickets.modifiedCount}`
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
