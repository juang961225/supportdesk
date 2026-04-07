import { Response, NextFunction } from 'express'
import Brand from '../models/Brand'
import { AuthRequest } from '../middlewares/auth'

// Función helper — convierte "BMW Colombia" en "bmw-colombia"
const generateSlug = (nombre: string): string => {
  return nombre
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')     // espacios → guiones
    .replace(/[^\w-]+/g, '')  // elimina caracteres especiales
}

// POST /api/brands — crear marca (solo superadmin)
export const createBrand = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { nombre } = req.body || {}

    if (!nombre) {
      res.status(400).json({ message: 'El nombre de la marca es obligatorio' })
      return
    }

    // Generamos el slug automáticamente del nombre
    const slug = generateSlug(nombre)

    // Verificamos que no exista una marca con ese slug
    const existing = await Brand.findOne({ slug })
    if (existing) {
      res.status(400).json({ message: 'Ya existe una marca con ese nombre' })
      return
    }

    const brand = await Brand.create({ nombre, slug })

    res.status(201).json({
      message: 'Marca creada exitosamente',
      brand
    })

  } catch (error) {
    next(error)
  }
}

// GET /api/brands — listar todas las marcas (solo superadmin)
export const getBrands = async (_req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const brands = await Brand.find()
      .populate('admin', 'nombre email') // trae solo nombre y email del admin
      .sort({ createdAt: -1 })           // más recientes primero

    res.status(200).json({ brands })

  } catch (error) {
    next(error)
  }
}

// GET /api/brands/:id — ver una marca
export const getBrandById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const brand = await Brand.findById(req.params.id)
      .populate('admin', 'nombre email')

    if (!brand) {
      res.status(404).json({ message: 'Marca no encontrada' })
      return
    }

    res.status(200).json({ brand })

  } catch (error) {
    next(error)
  }
}

// PUT /api/brands/:id — actualizar marca (solo superadmin)
export const updateBrand = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { nombre, estado } = req.body

    const estadosValidos = ['activo', 'inactivo']
    if (estado && !estadosValidos.includes(estado)) {
      res.status(400).json({ message: 'Estado inválido. Debe ser activo o inactivo' })
      return
    }

    const brand = await Brand.findById(req.params.id)
    if (!brand) {
      res.status(404).json({ message: 'Marca no encontrada' })
      return
    }

    // Solo actualizamos los campos que vengan en el body
    if (nombre) {
      brand.nombre = nombre
      brand.slug = generateSlug(nombre)
    }
    if (estado) brand.estado = estado

    await brand.save()

    res.status(200).json({
      message: 'Marca actualizada exitosamente',
      brand
    })

  } catch (error) {
    next(error)
  }
}