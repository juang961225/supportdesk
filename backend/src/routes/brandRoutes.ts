import { Router } from 'express'
import { createBrand, getBrands, getBrandById, updateBrand, assignAdmin } from '../controllers/brandController'
import { authenticate, authorize } from '../middlewares/auth'
import { validarBody } from '../validacion/validar'
import { esquemaCrearMarca, esquemaEditarMarca, esquemaAsignarAdmin } from '../validacion/esquemas'

const router = Router()

// Todas las rutas de brands requieren estar autenticado y ser superadmin
router.post('/', authenticate, authorize('superadmin'), validarBody(esquemaCrearMarca), createBrand)
router.get('/', authenticate, authorize('superadmin'), getBrands)
router.get('/:id', authenticate, authorize('superadmin', 'admin'), getBrandById)
router.put('/:id', authenticate, authorize('superadmin'), validarBody(esquemaEditarMarca), updateBrand)
router.put('/:id/assign-admin', authenticate, authorize('superadmin'), validarBody(esquemaAsignarAdmin), assignAdmin)

export default router