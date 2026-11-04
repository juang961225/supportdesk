import { Response, NextFunction } from 'express'
import SubMarca from '../models/SubMarca'
import User from '../models/User'
import { AuthRequest } from '../middlewares/auth'

// GET /api/submarcas — superadmin: todas (solo lectura) · admin: las de su marca
// soporte: las activas de su marca · usuario: las suyas activas
export const getSubMarcas = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { rol, marca, id } = req.user!

    if (rol === 'superadmin') {
      const submarcas = await SubMarca.find().populate('marca', 'nombre').sort({ nombre: 1 })
      res.status(200).json({ submarcas })
      return
    }

    const filtro: Record<string, unknown> = rol === 'admin' ? { marca } : { marca, activo: true }
    if (rol === 'usuario') {
      const usuario = await User.findById(id).select('submarcas').lean()
      filtro._id = { $in: usuario?.submarcas ?? [] }
    }

    const submarcas = await SubMarca.find(filtro).sort({ nombre: 1 })
    res.status(200).json({ submarcas })

  } catch (error) {
    next(error)
  }
}

// POST /api/submarcas — crear sub-marca (admin)
export const createSubMarca = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { nombre } = req.body
    const marca = req.user?.marca

    const existing = await SubMarca.findOne({ marca, nombre })
    if (existing) {
      res.status(400).json({ message: 'Ya existe una sub-marca con ese nombre en tu marca' })
      return
    }

    const submarca = await SubMarca.create({ nombre, marca })
    res.status(201).json({ message: 'Sub-marca creada exitosamente', submarca })

  } catch (error) {
    next(error)
  }
}

// PUT /api/submarcas/:id — renombrar (admin)
export const updateSubMarca = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { nombre } = req.body
    const marca = req.user?.marca

    const submarca = await SubMarca.findOne({ _id: req.params.id, marca })
    if (!submarca) {
      res.status(404).json({ message: 'Sub-marca no encontrada' })
      return
    }

    const duplicada = await SubMarca.findOne({ marca, nombre, _id: { $ne: submarca._id } })
    if (duplicada) {
      res.status(400).json({ message: 'Ya existe una sub-marca con ese nombre en tu marca' })
      return
    }

    submarca.nombre = nombre
    await submarca.save()
    res.status(200).json({ message: 'Sub-marca actualizada exitosamente', submarca })

  } catch (error) {
    next(error)
  }
}

// PATCH /api/submarcas/:id/estado — activar / desactivar (admin)
// Desactivar solo impide crear tickets nuevos con ella; los existentes la conservan.
// La marca debe quedar con al menos una activa, o nadie podría crear tickets
export const updateSubMarcaEstado = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { activo } = req.body
    const marca = req.user?.marca

    const submarca = await SubMarca.findOne({ _id: req.params.id, marca })
    if (!submarca) {
      res.status(404).json({ message: 'Sub-marca no encontrada' })
      return
    }

    if (!activo) {
      const otrasActivas = await SubMarca.exists({ marca, activo: true, _id: { $ne: submarca._id } })
      if (!otrasActivas) {
        res.status(400).json({ message: 'La marca debe tener al menos una sub-marca activa' })
        return
      }
    }

    submarca.activo = activo
    await submarca.save()
    res.status(200).json({ message: `Sub-marca ${activo ? 'activada' : 'desactivada'} exitosamente`, submarca })

  } catch (error) {
    next(error)
  }
}
