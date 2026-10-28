// Genera datos de prueba para la prueba de carga en una base LOCAL (Docker). Nunca contra Atlas.
// Uso: MONGODB_URI=mongodb://localhost:27018/supportdesk_carga npm run carga:datos
//
// Crea 1 marca con 3 áreas, 1 admin, 10 soportes y 89 usuarios (100 en total), 3000 tickets con su
// historial y algunos comentarios. Deja en carga/.datos-carga.json los ids que usa la prueba.

import fs from 'fs'
import path from 'path'
import bcrypt from 'bcryptjs'
import mongoose from 'mongoose'
import Brand from '../src/models/Brand'
import Area from '../src/models/Area'
import TicketCategory from '../src/models/TicketCategory'
import User from '../src/models/User'
import Ticket from '../src/models/Ticket'
import TicketEvent from '../src/models/TicketEvent'
import Comment from '../src/models/Comment'
import { calcularFechaLimite } from '../src/utils/fechaLimite'
import { HORARIO_POR_DEFECTO } from '../src/utils/horarioLaboral'

const TICKETS = 3000
const SOPORTES = 10
const USUARIOS = 89
const PRIORIDADES = ['baja', 'media', 'alta', 'critica'] as const
const ESTADOS = ['abierto', 'en_progreso', 'en_revision', 'cerrado', 'reabierto'] as const
const DIA_MS = 24 * 60 * 60 * 1000

const uri = process.env.MONGODB_URI ?? ''

const alAzar = <T>(lista: readonly T[]): T => lista[Math.floor(Math.random() * lista.length)]

const main = async () => {
  // Protección: solo una base local (la de Docker), para no llenar ni borrar la base real
  const host = uri.replace(/^mongodb(\+srv)?:\/\//, '').split(/[/:?]/)[0]
  if (!['localhost', '127.0.0.1'].includes(host)) {
    console.error('Solo se permite una base local (localhost). Revisa MONGODB_URI.')
    process.exit(1)
  }

  await mongoose.connect(uri)
  await mongoose.connection.dropDatabase()
  console.log('Base local limpia. Generando datos…')

  const marca = await Brand.create({ nombre: 'Carga', slug: 'carga' })
  const areas = await Area.insertMany(['Redes', 'Software', 'Hardware'].map((nombre) => ({ nombre, marca: marca._id, activo: true })))
  const categorias = await TicketCategory.insertMany(areas.map((a) => ({ nombre: `Problemas de ${a.nombre}`, marca: marca._id, area: a._id, activo: true })))

  const password = await bcrypt.hash('carga1234', 10)
  const admin = await User.create({ nombre: 'Admin Carga', email: 'admin@carga.test', password, rol: 'admin', marca: marca._id })
  const soportes = await User.insertMany(Array.from({ length: SOPORTES }, (_, i) => ({
    nombre: `Soporte ${i + 1}`, email: `soporte${i + 1}@carga.test`, password, rol: 'soporte', marca: marca._id,
    areas: [areas[i % areas.length]._id]
  })))
  const usuarios = await User.insertMany(Array.from({ length: USUARIOS }, (_, i) => ({
    nombre: `Usuario ${i + 1}`, email: `usuario${i + 1}@carga.test`, password, rol: 'usuario', marca: marca._id
  })))

  const ahora = Date.now()
  const tickets = await Ticket.insertMany(Array.from({ length: TICKETS }, (_, i) => {
    const categoria = categorias[i % categorias.length]
    const area = areas[i % areas.length]
    const prioridad = alAzar(PRIORIDADES)
    const estado = alAzar(ESTADOS)
    const creado = new Date(ahora - Math.random() * 90 * DIA_MS)
    const soporte = soportes.filter((s) => String(s.areas[0]) === String(area._id))
    return {
      titulo: `Ticket de carga ${i + 1}`,
      descripcion: 'Descripción de prueba para medir el rendimiento con muchos tickets.',
      prioridad,
      estado,
      categoria: categoria._id,
      area: area._id,
      marca: marca._id,
      creadoPor: usuarios[i % usuarios.length]._id,
      asignadoA: estado === 'abierto' ? undefined : alAzar(soporte)._id,
      observadores: [],
      fechaLimite: calcularFechaLimite(prioridad, HORARIO_POR_DEFECTO, creado),
      fechaCierre: estado === 'cerrado' ? new Date(creado.getTime() + DIA_MS) : undefined,
      createdAt: creado,
      updatedAt: creado
    }
  }), { lean: true })

  await TicketEvent.insertMany(tickets.map((t) => ({ ticket: t._id, marca: marca._id, tipo: 'creado', autor: t.creadoPor, createdAt: t.createdAt })))
  await Comment.insertMany(tickets.filter((_, i) => i % 3 === 0).flatMap((t) => [
    { ticket: t._id, autor: t.creadoPor, contenido: 'Comentario del usuario', createdAt: t.createdAt },
    { ticket: t._id, autor: t.asignadoA ?? admin._id, contenido: 'Respuesta de soporte', createdAt: t.createdAt }
  ]))

  // Ids para la prueba: cada usuario con algunos de sus tickets (así nunca pide uno ajeno)
  const ticketsDe = (id: mongoose.Types.ObjectId) => tickets.filter((t) => String(t.creadoPor) === String(id)).slice(0, 5).map((t) => String(t._id))
  const datos = {
    admin: String(admin._id),
    soportes: soportes.map((s) => ({ id: String(s._id), tickets: tickets.filter((t) => String(t.area) === String(s.areas[0])).slice(0, 5).map((t) => String(t._id)) })),
    usuarios: usuarios.map((u) => ({ id: String(u._id), tickets: ticketsDe(u._id) })),
    tickets: tickets.slice(0, 50).map((t) => String(t._id))
  }
  fs.writeFileSync(path.join(__dirname, '.datos-carga.json'), JSON.stringify(datos))

  console.log(`Listo: 1 marca, ${areas.length} áreas, ${1 + SOPORTES + USUARIOS} usuarios, ${TICKETS} tickets.`)
  await mongoose.disconnect()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
