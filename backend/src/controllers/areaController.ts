import { Response, NextFunction } from 'express'
import Area from '../models/Area'
import TicketCategory from '../models/TicketCategory'
import Ticket from '../models/Ticket'
import User from '../models/User'
import { AuthRequest } from '../middlewares/auth'

// GET /api/areas — admin ve todas las de su marca; soporte solo las activas
export const getAreas = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { rol, marca } = req.user!
    const filtro: Record<string, unknown> = rol === 'admin' ? { marca } : { marca, activo: true }

    const areas = await Area.find(filtro).sort({ nombre: 1 })

    res.status(200).json({ areas })

  } catch (error) {
    next(error)
  }
}

// POST /api/areas — crear área (admin)
export const createArea = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { nombre, descripcion } = req.body || {}
    const marca = req.user?.marca

    if (!nombre) {
      res.status(400).json({ message: 'El nombre del área es obligatorio' })
      return
    }

    const existing = await Area.findOne({ marca, nombre })
    if (existing) {
      res.status(400).json({ message: 'Ya existe un área con ese nombre en tu marca' })
      return
    }

    const area = await Area.create({ nombre, descripcion, marca })

    res.status(201).json({ message: 'Área creada exitosamente', area })

  } catch (error) {
    next(error)
  }
}

// PUT /api/areas/:id — editar nombre y descripción (admin)
export const updateArea = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { nombre, descripcion } = req.body || {}
    const marca = req.user?.marca

    const area = await Area.findOne({ _id: req.params.id, marca })
    if (!area) {
      res.status(404).json({ message: 'Área no encontrada' })
      return
    }

    if (nombre && nombre !== area.nombre) {
      const existing = await Area.findOne({ marca, nombre })
      if (existing) {
        res.status(400).json({ message: 'Ya existe un área con ese nombre en tu marca' })
        return
      }
      area.nombre = nombre
    }
    if (descripcion !== undefined) area.descripcion = descripcion

    await area.save()

    res.status(200).json({ message: 'Área actualizada exitosamente', area })

  } catch (error) {
    next(error)
  }
}

// PATCH /api/areas/:id/estado — activar / desactivar (admin)
// No se desactiva un área con categorías activas o tickets abiertos
export const updateAreaEstado = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { activo } = req.body || {}
    const marca = req.user?.marca

    if (typeof activo !== 'boolean') {
      res.status(400).json({ message: 'El campo activo debe ser true o false' })
      return
    }

    const area = await Area.findOne({ _id: req.params.id, marca })
    if (!area) {
      res.status(404).json({ message: 'Área no encontrada' })
      return
    }

    if (!activo) {
      const tieneCategorias = await TicketCategory.exists({ area: area._id, activo: true })
      if (tieneCategorias) {
        res.status(400).json({ message: 'El área tiene categorías activas: cámbialas de área o desactívalas primero' })
        return
      }
      const tieneTickets = await Ticket.exists({ area: area._id, estado: { $ne: 'cerrado' } })
      if (tieneTickets) {
        res.status(400).json({ message: 'El área tiene tickets abiertos: muévelos o ciérralos primero' })
        return
      }
    }

    area.activo = activo
    await area.save()

    res.status(200).json({
      message: `Área ${activo ? 'activada' : 'desactivada'} exitosamente`,
      area
    })

  } catch (error) {
    next(error)
  }
}

// GET /api/areas/:id/soportes — soportes activos del área (para asignar o pasar)
// admin de la marca o soporte que pertenece al área
export const getAreaSoportes = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { rol, marca, areas } = req.user!

    const area = await Area.findOne({ _id: req.params.id, marca })
    if (!area) {
      res.status(404).json({ message: 'Área no encontrada' })
      return
    }

    if (rol === 'soporte' && !areas.includes(String(area._id))) {
      res.status(403).json({ message: 'No perteneces a esta área' })
      return
    }

    const soportes = await User.find({
      rol: 'soporte',
      estado: 'activo',
      marca,
      areas: area._id
    })
      .select('nombre email')
      .sort({ nombre: 1 })

    res.status(200).json({ soportes })

  } catch (error) {
    next(error)
  }
}
