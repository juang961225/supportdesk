import { Response } from 'express'
import TicketCategory from '../models/TicketCategory'
import { AuthRequest } from '../middlewares/auth'

// POST /api/categories — crear categoría (solo admin)
export const createCategory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { nombre, descripcion } = req.body || {}

    if (!nombre) {
      res.status(400).json({ message: 'El nombre de la categoría es obligatorio' })
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

    const category = await TicketCategory.create({
      nombre,
      descripcion,
      marca: marcaId
    })

    res.status(201).json({
      message: 'Categoría creada exitosamente',
      category
    })

  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Error interno del servidor' })
  }
}

// GET /api/categories — listar categorías de la marca
export const getCategories = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const marcaId = req.user?.marca

    if (!marcaId) {
      res.status(400).json({ message: 'No tienes una marca asignada' })
      return
    }

    const categories = await TicketCategory.find({
      marca: marcaId,
      activo: true
    }).sort({ nombre: 1 }) // orden alfabético

    res.status(200).json({ categories })

  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Error interno del servidor' })
  }
}

// PUT /api/categories/:id — editar categoría (solo admin)
export const updateCategory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { nombre, descripcion, activo } = req.body || {}
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

    await category.save()

    res.status(200).json({
      message: 'Categoría actualizada exitosamente',
      category
    })

  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Error interno del servidor' })
  }
}

// DELETE /api/categories/:id — desactivar categoría (solo admin)
export const deleteCategory = async (req: AuthRequest, res: Response): Promise<void> => {
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
    console.error(error)
    res.status(500).json({ message: 'Error interno del servidor' })
  }
}