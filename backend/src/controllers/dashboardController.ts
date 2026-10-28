import { Response, NextFunction } from 'express'
import mongoose from 'mongoose'
import Ticket from '../models/Ticket'
import Area from '../models/Area'
import User from '../models/User'
import Brand from '../models/Brand'
import { AuthRequest } from '../middlewares/auth'
import { tendenciasDeMarca, PERIODOS_VALIDOS } from '../services/tendencias'
import { conSla } from '../services/slaActual'

// Expresiones de agregación reutilizables
const estaAsignado = { $ifNull: ['$asignadoA', false] }
const estaVencido = (ahora: Date) => ({
  $and: [{ $ne: [{ $ifNull: ['$fechaLimite', null] }, null] }, { $lt: ['$fechaLimite', ahora] }]
})
const contarSi = (condicion: unknown) => ({ $sum: { $cond: [condicion, 1, 0] } })

interface ConteoArea {
  _id: mongoose.Types.ObjectId | null
  enCola: number
  enProgreso: number
  vencidos: number
}

interface ConteoSoporte {
  _id: mongoose.Types.ObjectId
  activos: number
  vencidos: number
}

// Resumen de una marca para el admin: contadores, por área, carga por soporte y urgentes
const resumenAdmin = async (marcaId: string) => {
  const ahora = new Date()
  const marca = new mongoose.Types.ObjectId(marcaId)
  const noCerrados = { marca, estado: { $ne: 'cerrado' as const } }

  const [abiertos, enProgreso, vencidos, criticos, cerrados] = await Promise.all([
    Ticket.countDocuments({ marca, estado: { $in: ['abierto', 'reabierto'] } }),
    Ticket.countDocuments({ marca, estado: { $in: ['en_progreso', 'en_revision'] } }),
    Ticket.countDocuments({ ...noCerrados, fechaLimite: { $lt: ahora } }),
    Ticket.countDocuments({ ...noCerrados, prioridad: 'critica' }),
    Ticket.countDocuments({ marca, estado: 'cerrado' })
  ])

  const [conteoAreas, conteoSoportes, areas, soportes, urgentes] = await Promise.all([
    Ticket.aggregate<ConteoArea>([
      { $match: noCerrados },
      {
        $group: {
          _id: '$area',
          enCola: contarSi({ $not: [estaAsignado] }),
          enProgreso: contarSi(estaAsignado),
          vencidos: contarSi(estaVencido(ahora))
        }
      }
    ]),
    Ticket.aggregate<ConteoSoporte>([
      { $match: { ...noCerrados, asignadoA: { $exists: true, $ne: null } } },
      { $group: { _id: '$asignadoA', activos: { $sum: 1 }, vencidos: contarSi(estaVencido(ahora)) } }
    ]),
    Area.find({ marca }).select('nombre activo').sort({ nombre: 1 }),
    User.find({ marca, rol: 'soporte', estado: 'activo' }).select('nombre').sort({ nombre: 1 }),
    // Urgentes: sin asignar o vencidos, los que vencen antes primero
    Ticket.find({
      ...noCerrados,
      $or: [{ asignadoA: { $exists: false } }, { asignadoA: null }, { fechaLimite: { $lt: ahora } }]
    })
      .select('titulo estado prioridad fechaLimite area asignadoA marca createdAt')
      .populate('area', 'nombre')
      .populate('asignadoA', 'nombre')
      .sort({ fechaLimite: 1 })
      .limit(10)
      .lean() // objetos planos: conSla les agrega el SLA
  ])

  // Todas las áreas activas aparecen aunque estén en cero; las inactivas solo si aún tienen tickets
  const porArea = areas
    .map((area) => {
      const conteo = conteoAreas.find((c) => String(c._id) === String(area._id))
      return {
        area: { _id: area._id, nombre: area.nombre },
        enCola: conteo?.enCola ?? 0,
        enProgreso: conteo?.enProgreso ?? 0,
        vencidos: conteo?.vencidos ?? 0,
        activo: area.activo
      }
    })
    .filter((a) => a.activo || a.enCola + a.enProgreso > 0)

  const cargaPorSoporte = soportes
    .map((soporte) => {
      const conteo = conteoSoportes.find((c) => String(c._id) === String(soporte._id))
      return { soporte: { _id: soporte._id, nombre: soporte.nombre }, activos: conteo?.activos ?? 0, vencidos: conteo?.vencidos ?? 0 }
    })
    .sort((a, b) => b.activos - a.activos)

  return {
    totales: { abiertos, enProgreso, vencidos, criticos, cerrados },
    porArea,
    cargaPorSoporte,
    urgentes: await conSla(urgentes)
  }
}

interface ConteoMarca {
  _id: mongoose.Types.ObjectId
  abiertos: number
  vencidos: number
  cerrados: number
}

// Resumen global para el superadmin: una fila por marca
const resumenSuperadmin = async () => {
  const ahora = new Date()
  const noCerrado = { $ne: ['$estado', 'cerrado'] }

  const [marcas, conteoTickets, conteoUsuarios] = await Promise.all([
    Brand.find().select('nombre estado').sort({ nombre: 1 }),
    Ticket.aggregate<ConteoMarca>([
      {
        $group: {
          _id: '$marca',
          abiertos: contarSi(noCerrado),
          vencidos: contarSi({ $and: [noCerrado, estaVencido(ahora)] }),
          cerrados: contarSi({ $eq: ['$estado', 'cerrado'] })
        }
      }
    ]),
    User.aggregate<{ _id: mongoose.Types.ObjectId; activos: number }>([
      { $match: { estado: 'activo', marca: { $exists: true } } },
      { $group: { _id: '$marca', activos: { $sum: 1 } } }
    ])
  ])

  const porMarca = marcas.map((marca) => {
    const tickets = conteoTickets.find((c) => String(c._id) === String(marca._id))
    const usuarios = conteoUsuarios.find((c) => String(c._id) === String(marca._id))
    return {
      marca: { _id: marca._id, nombre: marca.nombre, estado: marca.estado },
      abiertos: tickets?.abiertos ?? 0,
      vencidos: tickets?.vencidos ?? 0,
      cerrados: tickets?.cerrados ?? 0,
      usuariosActivos: usuarios?.activos ?? 0
    }
  })

  const totales = porMarca.reduce(
    (acc, m) => ({
      marcasActivas: acc.marcasActivas + (m.marca.estado === 'activo' ? 1 : 0),
      abiertos: acc.abiertos + m.abiertos,
      vencidos: acc.vencidos + m.vencidos,
      usuariosActivos: acc.usuariosActivos + m.usuariosActivos
    }),
    { marcasActivas: 0, abiertos: 0, vencidos: 0, usuariosActivos: 0 }
  )

  return { totales, porMarca }
}

// GET /api/dashboard/summary — métricas según el rol (admin: su marca · superadmin: global)
export const getDashboardSummary = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { rol, marca } = req.user!

    if (rol === 'superadmin') {
      res.status(200).json({ summary: await resumenSuperadmin() })
      return
    }

    if (!marca) {
      res.status(400).json({ message: 'No tienes una marca asignada' })
      return
    }

    res.status(200).json({ summary: await resumenAdmin(marca) })

  } catch (error) {
    next(error)
  }
}

// GET /api/dashboard/tendencias?dias=7|30|90 — gráficas del admin (su marca); por defecto 30 días
export const getTendencias = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { marca } = req.user!
    if (!marca) {
      res.status(400).json({ message: 'No tienes una marca asignada' })
      return
    }

    const pedido = Number(req.query.dias)
    const dias = PERIODOS_VALIDOS.find((p) => p === pedido) ?? 30

    res.status(200).json({ tendencias: await tendenciasDeMarca(marca, dias) })

  } catch (error) {
    next(error)
  }
}
