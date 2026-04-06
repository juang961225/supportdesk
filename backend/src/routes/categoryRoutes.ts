import { Router } from 'express'
import { createCategory, getCategories, updateCategory, deleteCategory } from '../controllers/categoryController'
import { authenticate, authorize } from '../middlewares/auth'

const router = Router()

// Crear y editar solo el admin — listar también el usuario y soporte
router.post('/', authenticate, authorize('admin', 'superadmin'), createCategory)
router.get('/', authenticate, authorize('admin', 'soporte', 'usuario'), getCategories)
router.put('/:id', authenticate, authorize('admin'), updateCategory)
router.delete('/:id', authenticate, authorize('admin'), deleteCategory)

export default router