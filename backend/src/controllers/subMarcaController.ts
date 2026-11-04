import { Response, NextFunction } from 'express'
import SubMarca from '../models/SubMarca'
import User from '../models/User'
import { AuthRequest } from '../middlewares/auth'
import { catalogoDeMarca } from '../services/catalogoOnlineBrief'
import { subMarcaAplica } from '../utils/contextoUsuario'

// GET /api/submarcas — superadmin: todas (solo lectura) · admin: las de su marca
// soporte: las activas de su marca · usuario: las suyas activas que apliquen a su organización
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
      const usuario = await User.findById(id).select('submarcas organizaciones').lean()
      filtro._id = { $in: usuario?.submarcas ?? [] }
      const suyas = await SubMarca.find(filtro).sort({ nombre: 1 })
      res.status(200).json({ submarcas: suyas.filter((s) => subMarcaAplica(s.organizaciones, usuario?.organizaciones)) })
      return
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
    const { nombre, organizaciones } = req.body
    const marca = req.user?.marca

    if (organizaciones && !(await organizacionesValidas(organizaciones, marca))) {
      res.status(400).json({ message: 'Alguna de las organizaciones no existe' })
      return
    }

    const existing = await SubMarca.findOne({ marca, nombre })
    if (existing) {
      res.status(400).json({ message: 'Ya existe una sub-marca con ese nombre en tu marca' })
      return
    }

    const submarca = await SubMarca.create({ nombre, marca, organizaciones: organizaciones ?? [] })
    res.status(201).json({ message: 'Sub-marca creada exitosamente', submarca })

  } catch (error) {
    next(error)
  }
}

// Si la marca no usa el catálogo de Online Brief no hay organizaciones que configurar
const organizacionesValidas = async (organizaciones: number[], marca: string | undefined): Promise<boolean> => {
  const catalogo = await catalogoDeMarca(marca)
  return organizaciones.every((o) => catalogo?.organizaciones.some((org) => org.id === o))
}

// PUT /api/submarcas/:id — renombrar y definir en qué organizaciones aplica (admin)
export const updateSubMarca = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { nombre, organizaciones } = req.body
    const marca = req.user?.marca

    if (organizaciones && !(await organizacionesValidas(organizaciones, marca))) {
      res.status(400).json({ message: 'Alguna de las organizaciones no existe' })
      return
    }

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
    if (organizaciones) submarca.organizaciones = organizaciones
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
