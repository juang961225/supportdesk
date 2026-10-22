import { Response, NextFunction } from 'express'
import TicketCategory from '../models/TicketCategory'
import Area from '../models/Area'
import { AuthRequest } from '../middlewares/auth'

// El área debe ser de la marca y estar activa
const areaValida = (areaId: string, marcaId: string | undefined) =>
  Area.exists({ _id: areaId, marca: marcaId, activo: true })

// POST /api/categories — crear categoría (solo admin)
export const createCategory = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { nombre, descripcion, areaId } = req.body || {}

    if (!nombre || !areaId) {
      res.status(400).json({ message: 'El nombre y el área de la categoría son obligatorios' })
      return
    }

    // La marca viene del token del admin logueado
    const marcaId = req.user?.marca

    if (!marcaId) {
      res.status(400).json({ message: 'No tienes una marca asignada' })
      return
    }

    // Verificar que no exista ya esa categoría en esta marca
    const existing = await TicketCategory.findOne({ nombre, marca: marcaId })
    if (existing) {
      res.status(400).json({ message: 'Ya existe una categoría con ese nombre en tu marca' })
      return
    }

    if (!(await areaValida(areaId, marcaId))) {
      res.status(400).json({ message: 'El área no existe, no es de tu marca o está inactiva' })
      return
    }

    const category = await TicketCategory.create({
      nombre,
      descripcion,
      marca: marcaId,
      area: areaId
    })

    res.status(201).json({
      message: 'Categoría creada exitosamente',
      category: await category.populate('area', 'nombre')
    })

  } catch (error) {
    next(error)
  }
}

// GET /api/categories — listar categorías de la marca
export const getCategories = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const marcaId = req.user?.marca

    if (!marcaId) {
      res.status(400).json({ message: 'No tienes una marca asignada' })
      return
    }

    // El admin ve también las inactivas (para poder reactivarlas); el resto solo las activas
    const filtro: Record<string, unknown> = req.user?.rol === 'admin'
      ? { marca: marcaId }
      : { marca: marcaId, activo: true }

    const categories = await TicketCategory.find(filtro)
      .populate('area', 'nombre')
      .sort({ nombre: 1 }) // orden alfabético

    res.status(200).json({ categories })

  } catch (error) {
    next(error)
  }
}

// PUT /api/categories/:id — editar categoría (solo admin)
export const updateCategory = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { nombre, descripcion, activo, areaId } = req.body || {}
    const marcaId = req.user?.marca

    const category = await TicketCategory.findOne({
      _id: req.params.id,
      marca: marcaId // verificamos que pertenezca a su marca
    })

    if (!category) {
      res.status(404).json({ message: 'Categoría no encontrada' })
      return
    }

    if (nombre) category.nombre = nombre
    if (descripcion) category.descripcion = descripcion
    if (activo !== undefined) category.activo = activo
    if (areaId && String(areaId) !== String(category.area)) {
      if (!(await areaValida(areaId, marcaId))) {
        res.status(400).json({ message: 'El área no existe, no es de tu marca o está inactiva' })
        return
      }
      // Solo afecta a tickets nuevos: los existentes siguen en su área actual
      category.area = areaId
    }

    await category.save()

    res.status(200).json({
      message: 'Categoría actualizada exitosamente',
      category: await category.populate('area', 'nombre')
    })

  } catch (error) {
    next(error)
  }
}

// DELETE /api/categories/:id — desactivar categoría (solo admin)
export const deleteCategory = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const marcaId = req.user?.marca

    const category = await TicketCategory.findOne({
      _id: req.params.id,
      marca: marcaId
    })

    if (!category) {
      res.status(404).json({ message: 'Categoría no encontrada' })
      return
    }

    // No borramos — desactivamos
    // Si borramos y hay tickets con esa categoría, pierden la referencia
    category.activo = false
    await category.save()

    res.status(200).json({ message: 'Categoría desactivada exitosamente' })

  } catch (error) {
    next(error)
  }
}