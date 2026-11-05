// Datos de demo para el servidor de pruebas: dos marcas con áreas, usuarios por rol y tickets.
// Al repetirlo borra y recrea SOLO esas dos marcas (por su slug); no toca nada más de la base.
// No envía correos: escribe directo en la base. Los avisos salen cuando se usa la app.
//
// Variables: SEED_EMAIL (buzón que recibe todo), SEED_PASSWORD (contraseña de todos los usuarios demo)
// y, si NODE_ENV=production, PERMITIR_SEED_DEMO=si
// Uso: npm run seed:demo
import bcrypt from 'bcryptjs'
import dotenv from 'dotenv'
import mongoose from 'mongoose'
import Area from '../models/Area'
import Brand from '../models/Brand'
import Comment from '../models/Comment'
import RefreshToken from '../models/RefreshToken'
import SubMarca from '../models/SubMarca'
import Ticket from '../models/Ticket'
import TicketCategory from '../models/TicketCategory'
import TicketEvent from '../models/TicketEvent'
import User from '../models/User'
import { obtenerCatalogo } from '../services/catalogoOnlineBrief'
import { CONTEXTO_VACIO, Catalogo, ContextoUsuario, ORG_LATAM, ORG_MEXICO, resolverContextoTicket, sedesPermitidas, subMarcaAplica } from '../utils/contextoUsuario'
import { SLUG_DEMO_BMW, SLUG_DEMO_OTRA, aliasDemo, elegirSedesDemo, revisarEntornoSeed, ticketsDemo } from '../utils/datosDemo'
import { calcularFechaLimite } from '../utils/fechaLimite'
import { HORARIO_POR_DEFECTO } from '../utils/horarioLaboral'
import { submarcasIniciales } from '../utils/submarcasIniciales'

dotenv.config()

const TICKETS_BMW = 24
const TICKETS_OTRA = 6
const HORA_MS = 60 * 60 * 1000
const DIA_MS = 24 * HORA_MS

type Id = mongoose.Types.ObjectId

interface UsuarioCreado {
  _id: Id
  nombre: string
  email: string
  rol: string
  areas: Id[]
  submarcas: Id[]
  contexto: ContextoUsuario
}

interface SubMarcaCreada {
  _id: Id
  nombre: string
  onlineBriefId?: number
  organizaciones: number[]
}

interface AreaCreada {
  _id: Id
  nombre: string
}

const borrarMarcasDemo = async (): Promise<void> => {
  const marcas = await Brand.find({ slug: { $in: [SLUG_DEMO_BMW, SLUG_DEMO_OTRA] } }).select('_id')
  if (marcas.length === 0) return
  const ids = marcas.map((m) => m._id)
  const [tickets, usuarios] = await Promise.all([
    Ticket.find({ marca: { $in: ids } }).select('_id'),
    User.find({ marca: { $in: ids } }).select('_id')
  ])
  const idsTickets = tickets.map((t) => t._id)
  await Promise.all([
    Comment.deleteMany({ ticket: { $in: idsTickets } }),
    TicketEvent.deleteMany({ marca: { $in: ids } }),
    RefreshToken.deleteMany({ usuario: { $in: usuarios.map((u) => u._id) } })
  ])
  await Promise.all([
    Ticket.deleteMany({ marca: { $in: ids } }),
    User.deleteMany({ marca: { $in: ids } }),
    Area.deleteMany({ marca: { $in: ids } }),
    TicketCategory.deleteMany({ marca: { $in: ids } }),
    SubMarca.deleteMany({ marca: { $in: ids } })
  ])
  await Brand.deleteMany({ _id: { $in: ids } })
}

const crearTickets = async (
  cantidad: number,
  marca: Id,
  areas: AreaCreada[],
  categorias: { _id: Id; area: Id }[],
  soportes: UsuarioCreado[],
  usuarios: UsuarioCreado[],
  submarcas: SubMarcaCreada[],
  catalogo: Catalogo | null
): Promise<void> => {
  const ahora = Date.now()
  const especificos = ticketsDemo(cantidad)
  const nombreArea = (id: Id): string => areas.find((a) => a._id.equals(id))?.nombre ?? ''

  const documentos = especificos.map((t, i) => {
    // Rota cada vuelta: así cada usuario tiene tickets en distintos estados
    const creador = usuarios[(i + Math.floor(i / usuarios.length)) % usuarios.length]
    const propias = submarcas.filter((s) => creador.submarcas.some((id) => id.equals(s._id)) && subMarcaAplica(s.organizaciones, creador.contexto.organizaciones))
    const submarca = propias[i % propias.length]
    const categoria = categorias[i % categorias.length]
    const creado = new Date(ahora - t.diasAtras * DIA_MS - HORA_MS)
    const fechaLimite = calcularFechaLimite(t.prioridad, HORARIO_POR_DEFECTO, creado)

    // El usuario corporativo alterna entre "Corporativo" y un concesionario
    let contexto
    if (catalogo) {
      const opciones = sedesPermitidas(creador.contexto, catalogo).filter((s) => s.brandId === submarca.onlineBriefId)
      const sede = creador.contexto.todosConcesionarios && i % 2 === 0 ? undefined : opciones[i % Math.max(opciones.length, 1)]?.clave
      const resultado = resolverContextoTicket(creador.contexto, sede, submarca.onlineBriefId, catalogo)
      contexto = resultado.ok ? resultado.contexto : undefined
    }

    const soporte = soportes.find((s) => s.areas.some((a) => a.equals(categoria.area))) ?? soportes[0]
    const cerrado = t.estado === 'cerrado' ? new Date(Math.min(creado.getTime() + 6 * HORA_MS, ahora)) : undefined
    return {
      titulo: t.titulo,
      descripcion: t.descripcion,
      prioridad: t.prioridad,
      estado: t.estado,
      categoria: categoria._id,
      area: categoria.area,
      submarca: submarca._id,
      contexto,
      marca,
      creadoPor: creador._id,
      asignadoA: t.estado === 'abierto' ? undefined : soporte._id,
      observadores: i % 5 === 0 ? [usuarios[(i + 1) % usuarios.length]._id].filter((id) => !id.equals(creador._id)) : [],
      fechaLimite,
      fechaCierre: cerrado,
      pausadoDesde: t.estado === 'resuelto' || t.estado === 'esperando_usuario' ? new Date(creado.getTime() + 2 * HORA_MS) : undefined,
      archivos: [],
      createdAt: creado,
      updatedAt: cerrado ?? creado
    }
  })

  // lean: conserva las fechas de la demo en vez de poner la de hoy
  const creados = await Ticket.insertMany(documentos, { lean: true })

  const eventos = creados.flatMap((t, i) => {
    const area = t.area as Id
    const base = t.createdAt.getTime()
    const lista: Record<string, unknown>[] = [{ ticket: t._id, marca, tipo: 'creado', autor: t.creadoPor, createdAt: t.createdAt }]
    const soporte = soportes.find((s) => t.asignadoA && s._id.equals(t.asignadoA))

    if (soporte) {
      lista.push({ ticket: t._id, marca, tipo: 'asignado', autor: soporte._id, a: String(soporte._id), aNombre: soporte.nombre, createdAt: new Date(base + HORA_MS) })
    }
    if (soporte && t.estado !== 'abierto') {
      const estadoFinal = t.estado === 'reabierto' ? 'resuelto' : t.estado
      lista.push({ ticket: t._id, marca, tipo: 'estado', autor: soporte._id, de: 'abierto', a: estadoFinal, createdAt: new Date(base + 2 * HORA_MS) })
    }
    if (t.estado === 'reabierto') {
      lista.push({ ticket: t._id, marca, tipo: 'estado', autor: t.creadoPor, de: 'resuelto', a: 'reabierto', fechaLimiteAnterior: t.fechaLimite, fechaLimiteNueva: t.fechaLimite, createdAt: new Date(base + 3 * HORA_MS) })
    }
    // Algunos en cola pasaron por otra área: se ve en "Tiempo por área"
    const otra = areas.find((a) => !a._id.equals(area))
    if (t.estado === 'abierto' && otra && i % 2 === 0) {
      lista.push({ ticket: t._id, marca, tipo: 'movido', autor: t.creadoPor, de: String(otra._id), deNombre: otra.nombre, a: String(area), aNombre: nombreArea(area), fechaLimiteAnterior: t.fechaLimite, createdAt: new Date(base + 30 * 60 * 1000) })
    }
    return lista
  })
  await TicketEvent.insertMany(eventos)

  const comentados = creados.filter((_, i) => i % 3 === 0)
  await Comment.insertMany(comentados.flatMap((t) => [
    { ticket: t._id, autor: t.creadoPor, contenido: 'Agrego más detalle: me pasa también desde otro equipo.', createdAt: new Date(t.createdAt.getTime() + 20 * 60 * 1000) },
    ...(t.asignadoA ? [{ ticket: t._id, autor: t.asignadoA, contenido: 'Recibido, lo estamos revisando.', createdAt: new Date(t.createdAt.getTime() + 90 * 60 * 1000) }] : [])
  ]))
}

const main = async (): Promise<void> => {
  const errores = revisarEntornoSeed(process.env)
  if (errores.length > 0) {
    errores.forEach((e) => console.error(`- ${e}`))
    process.exit(1)
  }

  const buzon = process.env.SEED_EMAIL as string
  await mongoose.connect(process.env.MONGODB_URI as string)

  // Nunca pisar a alguien real: un alias ya usado fuera de las marcas demo detiene todo antes de borrar
  const marcasDemo = await Brand.find({ slug: { $in: [SLUG_DEMO_BMW, SLUG_DEMO_OTRA] } }).select('_id')
  const prefijo = aliasDemo(buzon, '').split('@')
  const patron = new RegExp(`^${prefijo[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}.*@${prefijo[1].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`)
  const ajeno = await User.exists({ email: patron, rol: { $ne: 'superadmin' }, marca: { $nin: marcasDemo.map((m) => m._id) } })
  if (ajeno) {
    console.error('Ya hay un usuario fuera de las marcas demo con uno de esos correos. No se cambió nada.')
    await mongoose.disconnect()
    process.exit(1)
  }

  await borrarMarcasDemo()

  const password = await bcrypt.hash(process.env.SEED_PASSWORD as string, 10)
  const correo = (etiqueta: string): string => aliasDemo(buzon, etiqueta)
  const catalogo = await obtenerCatalogo()
  if (!catalogo) console.warn('Sin catálogo de Online Brief: los usuarios demo se crean sin organización ni concesionario.')
  const sedes = catalogo ? elegirSedesDemo(catalogo) : { bmw: [], mini: [], importador: [] }

  const crearUsuario = async (datos: {
    nombre: string
    etiqueta: string
    rol: 'admin' | 'soporte' | 'usuario'
    marca: Id
    areas?: Id[]
    submarcas?: Id[]
    contexto?: ContextoUsuario
  }): Promise<UsuarioCreado> => {
    const contexto = catalogo ? datos.contexto ?? CONTEXTO_VACIO : CONTEXTO_VACIO
    const creado = await User.create({
      nombre: datos.nombre,
      email: correo(datos.etiqueta),
      password,
      rol: datos.rol,
      marca: datos.marca,
      areas: datos.areas ?? [],
      submarcas: datos.submarcas ?? [],
      ...contexto
    })
    return { _id: creado._id, nombre: creado.nombre, email: creado.email, rol: creado.rol, areas: datos.areas ?? [], submarcas: datos.submarcas ?? [], contexto }
  }

  // ── Demo BMW: sub-marcas ligadas a Online Brief, con organización y concesionarios ──
  const bmw = await Brand.create({ nombre: 'Demo BMW', slug: SLUG_DEMO_BMW })
  const submarcasBmw: SubMarcaCreada[] = await SubMarca.create(submarcasIniciales('bmw').map((s) => ({ ...s, marca: bmw._id })))
  const [bmwSub, miniSub] = submarcasBmw
  const areasBmw: AreaCreada[] = await Area.create(['Soporte nivel 1', 'Soporte nivel 2', 'Sistemas'].map((nombre) => ({ nombre, marca: bmw._id })))
  const categoriasBmw = await TicketCategory.create([
    { nombre: 'Consultas generales', marca: bmw._id, area: areasBmw[0]._id },
    { nombre: 'Fallas de la plataforma', marca: bmw._id, area: areasBmw[1]._id },
    { nombre: 'Accesos y usuarios', marca: bmw._id, area: areasBmw[2]._id }
  ])

  const adminBmw = await crearUsuario({ nombre: 'Admin Demo BMW', etiqueta: 'admin', rol: 'admin', marca: bmw._id })
  await Brand.findByIdAndUpdate(bmw._id, { admin: adminBmw._id })
  const soportesBmw = [
    await crearUsuario({ nombre: 'Soporte Demo Uno', etiqueta: 'soporte1', rol: 'soporte', marca: bmw._id, areas: [areasBmw[0]._id] }),
    await crearUsuario({ nombre: 'Soporte Demo Dos', etiqueta: 'soporte2', rol: 'soporte', marca: bmw._id, areas: [areasBmw[1]._id, areasBmw[2]._id] })
  ]
  const todas = submarcasBmw.map((s) => s._id)
  const usuariosBmw = [
    await crearUsuario({
      nombre: 'Usuario México', etiqueta: 'mexico', rol: 'usuario', marca: bmw._id, submarcas: [bmwSub._id, miniSub._id],
      contexto: { ...CONTEXTO_VACIO, organizaciones: [ORG_MEXICO], sedes: [sedes.bmw[0], sedes.mini[0]].filter(Boolean).map((s) => s.clave) }
    }),
    await crearUsuario({
      nombre: 'Usuario Varios Concesionarios', etiqueta: 'varios', rol: 'usuario', marca: bmw._id, submarcas: [bmwSub._id],
      contexto: { ...CONTEXTO_VACIO, organizaciones: [ORG_MEXICO], sedes: sedes.bmw.map((s) => s.clave) }
    }),
    await crearUsuario({
      nombre: 'Usuario LATAM', etiqueta: 'latam', rol: 'usuario', marca: bmw._id, submarcas: todas,
      contexto: { ...CONTEXTO_VACIO, organizaciones: [ORG_LATAM], sedes: sedes.importador.map((s) => s.clave) }
    }),
    await crearUsuario({
      nombre: 'Usuario Corporativo', etiqueta: 'corporativo', rol: 'usuario', marca: bmw._id, submarcas: todas,
      contexto: { ...CONTEXTO_VACIO, organizaciones: [ORG_MEXICO], todosConcesionarios: true }
    })
  ]
  await crearTickets(TICKETS_BMW, bmw._id, areasBmw, categoriasBmw.map((c) => ({ _id: c._id, area: c.area })), soportesBmw, usuariosBmw, submarcasBmw, catalogo)

  // ── Demo Otra: sin catálogo; sirve para comprobar que las marcas no se ven entre sí ──
  const otra = await Brand.create({ nombre: 'Demo Otra', slug: SLUG_DEMO_OTRA })
  const submarcasOtra: SubMarcaCreada[] = await SubMarca.create(submarcasIniciales('otra').map((s) => ({ ...s, marca: otra._id })))
  const areasOtra: AreaCreada[] = await Area.create([{ nombre: 'Mesa de ayuda', marca: otra._id }])
  const categoriasOtra = await TicketCategory.create([{ nombre: 'Solicitudes', marca: otra._id, area: areasOtra[0]._id }])
  const adminOtra = await crearUsuario({ nombre: 'Admin Demo Otra', etiqueta: 'admin.otra', rol: 'admin', marca: otra._id })
  await Brand.findByIdAndUpdate(otra._id, { admin: adminOtra._id })
  const soporteOtra = await crearUsuario({ nombre: 'Soporte Demo Otra', etiqueta: 'soporte.otra', rol: 'soporte', marca: otra._id, areas: [areasOtra[0]._id] })
  const usuarioOtra = await crearUsuario({ nombre: 'Usuario Demo Otra', etiqueta: 'usuario.otra', rol: 'usuario', marca: otra._id, submarcas: submarcasOtra.map((s) => s._id) })
  await crearTickets(TICKETS_OTRA, otra._id, areasOtra, categoriasOtra.map((c) => ({ _id: c._id, area: c.area })), [soporteOtra], [usuarioOtra], submarcasOtra, null)

  // Superadmin: solo si la base no tiene. Si ya es el de la demo, se le actualiza la contraseña
  const aliasSuper = correo('superadmin')
  const superadmin = await User.findOne({ rol: 'superadmin' }).select('email')
  let lineaSuper = `Superadmin: ya existe ${superadmin?.email ?? ''} (no se cambió)`
  if (!superadmin) {
    await User.create({ nombre: 'Superadmin Demo', email: aliasSuper, password, rol: 'superadmin' })
    lineaSuper = `Superadmin: ${aliasSuper}`
  } else if (superadmin.email === aliasSuper) {
    await User.updateOne({ _id: superadmin._id }, { password })
    lineaSuper = `Superadmin: ${aliasSuper}`
  }

  console.log([
    'Demo lista. Contraseña de todos: la de SEED_PASSWORD',
    lineaSuper,
    `Demo BMW (${TICKETS_BMW} tickets): ${['admin', 'soporte1', 'soporte2', 'mexico', 'varios', 'latam', 'corporativo'].map(correo).join(', ')}`,
    `Demo Otra (${TICKETS_OTRA} tickets): ${['admin.otra', 'soporte.otra', 'usuario.otra'].map(correo).join(', ')}`
  ].join('\n'))
  await mongoose.disconnect()
}

main().catch(async (error: unknown) => {
  console.error('Error al crear la demo:', error instanceof Error ? error.message : error)
  await mongoose.disconnect()
  process.exit(1)
})
