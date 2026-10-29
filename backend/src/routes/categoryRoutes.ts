import { Router } from 'express'
import { createCategory, getCategories, updateCategory, deleteCategory } from '../controllers/categoryController'
import { authenticate, authorize } from '../middlewares/auth'
import { validarBody } from '../validacion/validar'
import { esquemaCrearCategoria, esquemaEditarCategoria } from '../validacion/esquemas'

const router = Router()

// Crear y editar solo el admin — listar también el usuario y soporte
router.post('/', authenticate, authorize('admin'), validarBody(esquemaCrearCategoria), createCategory)
router.get('/', authenticate, authorize('admin', 'soporte', 'usuario'), getCategories)
router.put('/:id', authenticate, authorize('admin'), validarBody(esquemaEditarCategoria), updateCategory)
router.delete('/:id', authenticate, authorize('admin'), deleteCategory)

export default router