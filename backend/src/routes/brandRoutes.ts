import { Router } from 'express'
import { createBrand, getBrands, getBrandById, updateBrand, assignAdmin } from '../controllers/brandController'
import { authenticate, authorize } from '../middlewares/auth'

const router = Router()

// Todas las rutas de brands requieren estar autenticado y ser superadmin
router.post('/', authenticate, authorize('superadmin'), createBrand)
router.get('/', authenticate, authorize('superadmin'), getBrands)
router.get('/:id', authenticate, authorize('superadmin', 'admin'), getBrandById)
router.put('/:id', authenticate, authorize('superadmin'), updateBrand)
router.put('/:id/assign-admin', authenticate, authorize('superadmin'), assignAdmin)

export default router